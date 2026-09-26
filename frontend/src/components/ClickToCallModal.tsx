import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  X,
  CheckCircle2,
  AlertCircle,
  Server,
  User as UserIcon,
  Building2,
  Edit2,
  Check,
  RotateCcw,
  Sparkles,
  Phone,
  Clock,
  Radio,
  Volume2,
} from 'lucide-react';
import { User, LdapDomain, Contact } from '../types';
import { originateVoipCall, hangupVoipCall, checkVoipChannelStatus } from '../services/apiService';
import { setExtensionBlfState } from '../services/blfService';
import { formatOutboundTrunkNumber, sanitizeDigitsOnly, isInternalExtension } from '../utils/phoneUtils';
import { AnimatedAntennaIcon } from './AnimatedAntennaIcon';

interface ClickToCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetNumber: string;
  targetTitle?: string;
  contact?: Contact | null;
  currentUser: User;
  ldapDomains: LdapDomain[];
}

type CallStage = 'ready' | 'originate_sending' | 'ringing_desk' | 'connected' | 'ended' | 'error';

export const ClickToCallModal: React.FC<ClickToCallModalProps> = ({
  isOpen,
  onClose,
  targetNumber,
  targetTitle,
  contact,
  currentUser,
  ldapDomains,
}) => {
  // Find user's active domain VoIP settings with complete matching criteria
  const userDomain = ldapDomains.find(
    (d) =>
      (currentUser.domain_id && String(d.id) === String(currentUser.domain_id)) ||
      (currentUser.domain && (
        String(d.id) === String(currentUser.domain) ||
        (d.name && d.name.toLowerCase() === currentUser.domain.toLowerCase()) ||
        (d.display_name && d.display_name.toLowerCase() === currentUser.domain.toLowerCase()) ||
        (d.base_dn && d.base_dn.toLowerCase().includes(currentUser.domain.toLowerCase()))
      ))
  ) || ldapDomains.find((d) => d.is_default && d.is_active) || ldapDomains.find((d) => d.is_default) || ldapDomains[0];

  const defaultExt = currentUser.extension || '205';
  const [callerExtension, setCallerExtension] = useState(defaultExt);
  const [isEditingExt, setIsEditingExt] = useState(false);
  const [stage, setStage] = useState<CallStage>('ready');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isHangingUp, setIsHangingUp] = useState(false);
  const [ringCountdown, setRingCountdown] = useState(30);

  // ۵- محاسبه خودکار پیش‌شماره ترانک شهری (Trunk Prefix) برای تماس‌های خارجی
  // برای شماره‌های داخلی سازمانی (۲ تا ۵ رقمی)، تحت هیچ شرایطی پیش‌شماره ترانک اضافه نمی‌شود.
  const rawTargetDigits = sanitizeDigitsOnly(targetNumber);
  const trunkPrefix = userDomain?.voip_trunk_prefix || ldapDomains.find((d) => d.voip_trunk_prefix)?.voip_trunk_prefix;
  const isInternal = isInternalExtension(targetNumber, contact);
  const dialedNumber = formatOutboundTrunkNumber(targetNumber, trunkPrefix, contact);
  const isTrunkApplied = Boolean(!isInternal && trunkPrefix && dialedNumber !== rawTargetDigits);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setCallerExtension(currentUser.extension || '205');
      setIsEditingExt(false);
      setStage('ready');
      setErrorMessage(null);
      setCallDuration(0);
      setIsHangingUp(false);
      setRingCountdown(30);
    }
  }, [isOpen, targetNumber, currentUser]);

  // ۳- شمارش مدت تماس منحصراً زمانی آغاز می‌شود که تماس به وضعیت connected (برقراری مکالمه) رسیده باشد
  useEffect(() => {
    let timer: any = null;
    if (stage === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [stage]);

  // ۳- مدیریت مرحله زنگ خوردن تلفن رومیزی (ringing_desk) و مهلت پاسخگویی سرور VoIP
  useEffect(() => {
    let countdownTimer: any = null;
    let pollTimer: any = null;

    if (stage === 'ringing_desk') {
      setRingCountdown(30);

      // الف) تایمر شمارش معکوس مهلت پاسخگویی (۳۰ ثانیه زمان استاندارد تایم‌اوت Originate در سرور VoIP)
      countdownTimer = setInterval(() => {
        setRingCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            setStage('ended');
            setErrorMessage('تماس به دلیل عدم برداشتن گوشی رومیزی توسط مرکز تلفن لغو گردید (پایان مهلت پاسخگویی).');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // ب) استعلام بلادرنگ وضعیت کانال از مرکز تلفن؛ مکالمه تنها زمانی آغاز می‌شود که گوشی فیزیکی برداشته شده باشد (Up / Answered)
      if (userDomain?.voip_enabled) {
        pollTimer = setInterval(async () => {
          try {
            const status = await checkVoipChannelStatus({
              callerExtension: callerExtension.trim(),
              domain: userDomain,
            });

            // تشخیص خودکار برداشتن گوشی توسط مبدا (وضعیت کانال Up یا پاسخ داده شده)
            // تا گوشی رومیزی برداشته نشود به شمارنده نمی‌رود
            if (status.answered === true || status.state === 'Up') {
              handleHandsetPickedUp();
            }
          } catch {
            // نادیده گرفتن خطاهای شبکه در استعلام اولیه
          }
        }, 1200);
      }
    }

    return () => {
      if (countdownTimer) clearInterval(countdownTimer);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [stage, callerExtension, userDomain]);

  // Channel Polling در حین مکالمه فعال (connected)
  useEffect(() => {
    let pollInterval: any = null;
    if (stage === 'connected' && userDomain?.voip_enabled) {
      let consecutiveInactiveCount = 0;
      pollInterval = setInterval(async () => {
        try {
          const status = await checkVoipChannelStatus({
            callerExtension: callerExtension.trim(),
            domain: userDomain,
          });

          if (!status.active) {
            consecutiveInactiveCount++;
            if (consecutiveInactiveCount >= 2) {
              setStage('ended');
              setExtensionBlfState(callerExtension.trim(), 'idle', 0);
              const cleanTarget = targetNumber.trim();
              if (cleanTarget.length <= 5 && !cleanTarget.startsWith('0')) {
                setExtensionBlfState(cleanTarget, 'idle', 0);
              }
            }
          } else {
            consecutiveInactiveCount = 0;
            if (typeof status.duration === 'number' && status.duration > 0) {
              setCallDuration(status.duration);
              setExtensionBlfState(callerExtension.trim(), 'busy', status.duration, targetNumber);
            }
          }
        } catch {
          // خطاهای گذرا در پایش نادیده گرفته می‌شوند
        }
      }, 2500);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [stage, callerExtension, userDomain, targetNumber]);

  if (!isOpen) return null;

  const targetDisplayName = contact
    ? `${contact.prefix_title === 'ms' ? 'خانم' : contact.prefix_title === 'location' ? '' : 'آقای'} ${[contact.first_name, contact.last_name].filter(Boolean).join(' ')}`
    : targetTitle || 'مخاطب';

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartCall = async () => {
    if (!callerExtension.trim()) {
      setErrorMessage('شماره داخلی تلفن رومیزی نمی‌تواند خالی باشد.');
      return;
    }

    setStage('originate_sending');
    setErrorMessage(null);

    try {
      // 1. Send Originate command to VoIP server
      const res = await originateVoipCall({
        targetNumber: dialedNumber,
        targetName: targetDisplayName,
        callerExtension: callerExtension.trim(),
        domain: userDomain,
      });

      if (res.success) {
        // ۲. تلفن رومیزی در حال زنگ خوردن است (هنوز مکالمه آغاز نشده است!)
        setStage('ringing_desk');
        setRingCountdown(30);
        setExtensionBlfState(callerExtension.trim(), 'ringing', 0, targetNumber);
      } else {
        setStage('error');
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setStage('error');
      setErrorMessage(err.message || 'خطا در برقراری ارتباط با سرور VoIP');
    }
  };

  // تأیید برداشتن گوشی فیزیکی رومیزی (Off-hook)
  const handleHandsetPickedUp = () => {
    setStage('connected');
    setCallDuration(1);
    setExtensionBlfState(callerExtension.trim(), 'busy', 1, targetNumber);
    const cleanTarget = targetNumber.trim();
    if (cleanTarget.length <= 5 && !cleanTarget.startsWith('0')) {
      setExtensionBlfState(cleanTarget, 'busy', 1, callerExtension.trim());
    }
  };

  const handleEndCall = async () => {
    setIsHangingUp(true);
    setExtensionBlfState(callerExtension.trim(), 'idle', 0);
    const cleanTarget = targetNumber.trim();
    if (cleanTarget.length <= 5 && !cleanTarget.startsWith('0')) {
      setExtensionBlfState(cleanTarget, 'idle', 0);
    }
    try {
      if (userDomain?.voip_enabled) {
        await hangupVoipCall({
          callerExtension: callerExtension.trim(),
          domain: userDomain,
        });
      }
    } catch (e) {
      console.warn('Hangup request ignored:', e);
    } finally {
      setIsHangingUp(false);
      setStage('ended');
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden border border-neutral-200 text-neutral-900">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <PhoneCall className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900">
                  تماس مستقیم از گوشی IP رومیزی
                </h2>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                  VoIP / AMI
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                یکپارچه‌سازی هوشمند سیستم اطلاعات و مرکز تلفنی مبتنی بر شبکه (IP)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          
          {/* Destination Target Box */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] text-neutral-500 block">مقصد تماس:</span>
              <div className="text-sm font-bold text-neutral-900">{targetDisplayName}</div>
              {contact?.department && (
                <div className="text-xs text-neutral-500">{contact.department}</div>
              )}
            </div>

            <div className="text-left space-y-1">
              <div className="text-xs font-mono font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-neutral-200 shadow-2xs inline-block" dir="ltr">
                {targetNumber}
              </div>
              {/* نشان اعمال پیش‌شماره ترانک یا تماس داخلی */}
              {isTrunkApplied ? (
                <div className="flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded font-mono" dir="ltr" title="پیش‌شماره خط شهری ترانک در پس‌زمینه اضافه گردید">
                  <span>Trunk [{trunkPrefix}]: {dialedNumber}</span>
                </div>
              ) : isInternal ? (
                <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium" title="تماس مستقیم با داخلی درون‌سازمانی (بدون پیش‌شماره ترانک)">
                  <span>داخلی سازمانی (مستقیم)</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Caller Extension Info Box */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                <UserIcon className="w-4 h-4 text-blue-600" />
                <span>داخلی مبدأ (گوشی تلفن رومیزی شما):</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {isAdmin && !isEditingExt && (
                    <button
                      type="button"
                      onClick={() => setIsEditingExt(true)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 inline-flex items-center gap-0.5 cursor-pointer"
                      title="تغییر موقت داخلی در صورت حضور در اتاق دیگر (ویژه مدیر سیستم)"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>تغییر موقت</span>
                    </button>
                  )}
                </div>

                {isEditingExt && isAdmin ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="text"
                      value={callerExtension}
                      onChange={(e) => setCallerExtension(sanitizeDigitsOnly(e.target.value))}
                      placeholder="مثلاً 205"
                      className="w-28 px-3 py-1.5 text-sm font-bold text-center text-neutral-900 bg-white border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
                      dir="ltr"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setIsEditingExt(false)}
                      className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer shadow-2xs"
                      title="تایید"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCallerExtension(currentUser.extension || '205');
                        setIsEditingExt(false);
                      }}
                      className="p-1.5 text-neutral-500 hover:text-neutral-700 rounded-lg hover:bg-blue-100/50"
                      title="بازنشانی به داخلی اکتیودایرکتوری"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-1">
                    <div className="inline-flex items-center justify-center min-w-[130px] px-4 py-1.5 bg-white rounded-lg border border-neutral-300 shadow-2xs text-center">
                      <span className="text-sm font-bold text-neutral-900 tracking-normal">
                        داخلی {callerExtension}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* VoIP Server Info */}
            <div className="pt-2 border-t border-blue-100 flex items-center justify-between text-[11px] text-neutral-600">
              <span className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-neutral-500" />
                <span>
                  سرور سیستم تلفن مبتنی بر IP: <strong className="font-semibold text-neutral-800">{userDomain.display_name || userDomain.domain_name || userDomain.name || 'ستاد مرکزی'}</strong>
                </span>
              </span>
              {trunkPrefix && (
                <span className="text-[10px] text-neutral-500 font-mono">
                  پیش‌شماره شهری: {trunkPrefix}
                </span>
              )}
            </div>
          </div>

          {/* Interactive Call Progress Status */}
          {stage === 'originate_sending' && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3 animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 animate-spin">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold">در حال ارسال فرمان برقراری تماس به سرور VoIP...</div>
                <div className="text-amber-700 mt-0.5">برقراری ارتباط با مرکز تلفن و به صدا درآوردن زنگ داخلی {callerExtension}</div>
              </div>
            </div>
          )}

          {/* ۳- مرحله زنگ تلفن رومیزی: تا گوشی برداشته نشود به حالت مکالمه و تایمر نمی‌رود */}
          {stage === 'ringing_desk' && (
            <div className="p-4 rounded-xl bg-sky-50 border-2 border-sky-400 text-sky-950 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <PhoneForwarded className="w-6 h-6 animate-bounce" />
                </div>
                <div className="text-xs space-y-1 flex-1">
                  <div className="font-black text-sm text-sky-950 flex items-center justify-between">
                    <span>گوشی تلفن رومیزی شما در حال زنگ خوردن است...</span>
                    <span className="text-[11px] font-mono bg-sky-200/80 text-sky-900 px-2 py-0.5 rounded font-bold">
                      {ringCountdown} ثانیه
                    </span>
                  </div>
                  <p className="text-sky-800 leading-relaxed">
                    لطفاً گوشی تلفن روی میز خود را بردارید. سیستم به محض تشخیص برداشتن گوشی، با شماره مقصد ارتباط برقرار کرده و شمارش مکالمه آغاز می‌شود.
                  </p>
                </div>
              </div>

              {/* Action status & Cancel inside ringing box */}
              <div className="flex items-center justify-between pt-2.5 border-t border-sky-200 gap-3">
                <div className="text-[11px] text-sky-800 flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600 animate-ping shrink-0"></span>
                  <span>در انتظار برداشتن گوشی فیزیکی تلفن رومیزی (Off-hook)...</span>
                </div>
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 shadow-2xs flex items-center gap-1.5"
                >
                  <PhoneOff className="w-3.5 h-3.5 text-rose-600" />
                  <span>لغو تماس</span>
                </button>
              </div>
            </div>
          )}

          {/* مرحله مکالمه برقرار شده: تایمر اکنون در حال اجراست و آیکن آنتن فعال است */}
          {stage === 'connected' && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm relative">
                  <PhoneCall className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                    <span>مکالمه برقرار شد (ارتباط روی خط داخلی {callerExtension})</span>
                    <AnimatedAntennaIcon size="sm" className="text-emerald-700" />
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    صدای مخاطب روی گوشی تلفن رومیزی شما در حال پخش است
                  </div>
                </div>
              </div>
              <div className="font-mono text-base font-black text-emerald-800 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-2xs" dir="ltr">
                {formatTimer(callDuration)}
              </div>
            </div>
          )}

          {stage === 'ended' && (
            <div className="p-4 bg-neutral-100 border border-neutral-300 text-neutral-800 rounded-xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">مکالمه یا تلاش برای تماس به پایان رسید.</span>
              </div>
              {callDuration > 0 && (
                <span className="text-[11px] text-neutral-500 font-mono">
                  مدت مکالمه: {formatTimer(callDuration)}
                </span>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-xl transition cursor-pointer"
          >
            بستن پنجره
          </button>

          {stage === 'ready' || stage === 'error' ? (
            <button
              type="button"
              onClick={handleStartCall}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>شماره‌گیری از تلفن رومیزی (داخلی {callerExtension})</span>
            </button>
          ) : stage === 'connected' || stage === 'ringing_desk' ? (
            <button
              type="button"
              onClick={handleEndCall}
              disabled={isHangingUp}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <PhoneOff className={`w-4 h-4 ${isHangingUp ? 'animate-spin' : ''}`} />
              <span>{isHangingUp ? 'در حال قطع تماس...' : 'قطع تماس'}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
