import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { User, LdapDomain, Contact } from '../types';
import { originateVoipCall, hangupVoipCall, checkVoipChannelStatus } from '../services/apiService';

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
  // Find user's active domain VoIP settings
  const userDomain = ldapDomains.find(
    (d) => d.name.toLowerCase() === (currentUser.domain || '').toLowerCase()
  ) || ldapDomains.find((d) => d.is_default) || ldapDomains[0];

  const defaultExt = currentUser.extension || '205';
  const [callerExtension, setCallerExtension] = useState(defaultExt);
  const [isEditingExt, setIsEditingExt] = useState(false);
  const [stage, setStage] = useState<CallStage>('ready');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isHangingUp, setIsHangingUp] = useState(false);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setCallerExtension(currentUser.extension || '205');
      setIsEditingExt(false);
      setStage('ready');
      setErrorMessage(null);
      setCallDuration(0);
      setIsHangingUp(false);
    }
  }, [isOpen, targetNumber, currentUser]);

  // Call timer when connected
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

  // Channel Polling: استعلام زنده وضعیت کانال از سرور VoIP تا در صورت قطع گوشی فیزیکی، تایمر و وضعیت متوقف شود
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
            }
          } else {
            consecutiveInactiveCount = 0;
            if (typeof status.duration === 'number' && status.duration > 0) {
              setCallDuration(status.duration);
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
  }, [stage, callerExtension, userDomain]);

  if (!isOpen) return null;

  const targetDisplayName = contact
    ? `${contact.prefix_title === 'ms' ? 'خانم' : 'آقای'} ${contact.first_name} ${contact.last_name}`
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
      // 1. Send Originate command to Issabel
      const res = await originateVoipCall({
        targetNumber,
        targetName: targetDisplayName,
        callerExtension: callerExtension.trim(),
        domain: userDomain,
      });

      if (res.success) {
        // 2. Desk phone is ringing!
        setStage('ringing_desk');

        // 3. User lifts handset after ~2 seconds -> call connects!
        setTimeout(() => {
          setStage('connected');
        }, 2500);
      } else {
        setStage('error');
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setStage('error');
      setErrorMessage(err.message || 'خطا در برقراری ارتباط با سرور VoIP');
    }
  };

  const handleEndCall = async () => {
    setIsHangingUp(true);
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
                  VoIP
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
              {contact?.job_title && (
                <div className="text-xs text-neutral-500">{contact.job_title} - {contact.department}</div>
              )}
            </div>
            <div className="text-left" dir="ltr">
              <span className="text-[10px] text-neutral-400 block font-sans">Target Number</span>
              <span className="text-lg font-mono font-black text-blue-600 tracking-wider">
                {targetNumber}
              </span>
            </div>
          </div>

          {/* Caller Source Box (Active Directory IP Phone) */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-blue-700" />
                <span className="text-xs font-bold text-blue-900">
                  مبدا تماس: تلفن رومیزی شما
                </span>
              </div>
              <span className="text-[11px] font-medium text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                دریافت‌شده از Active Directory
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[11px] text-neutral-500 block mb-0.5">کاربر جاری و دامین:</span>
                <div className="text-xs font-semibold text-neutral-800">
                  {currentUser.name} ({currentUser.domain || 'دامین پیش‌فرض'})
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-medium text-neutral-600 block">شماره داخلی شما:</span>
                  {!isEditingExt && isAdmin && (
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
                      onChange={(e) => setCallerExtension(e.target.value)}
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
                <div className="text-amber-700 mt-0.5">برقراری ارتباط با مرکز تلفن و فعال‌سازی چنل داخلی {callerExtension}</div>
              </div>
            </div>
          )}

          {stage === 'ringing_desk' && (
            <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-400 text-blue-950 flex items-center gap-3.5 animate-pulse duration-700">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <PhoneForwarded className="w-5 h-5 animate-bounce" />
              </div>
              <div className="text-xs space-y-1">
                <div className="font-extrabold text-sm text-blue-900">
                  تلفن رومیزی شما (داخلی {callerExtension}) در حال زنگ خوردن است!
                </div>
                <div className="text-blue-700">
                  لطفاً گوشی تلفن روی میز خود را بردارید؛ به محض برداشتن، سیستم تلفنی شماره {targetNumber} را شماره‌گیری خواهد کرد.
                </div>
              </div>
            </div>
          )}

          {stage === 'connected' && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-900">
                    مکالمه برقرار شد (ارتباط روی خط داخلی {callerExtension})
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    صدای مخاطب روی گوشی تلفن رومیزی شما پخش می‌شود
                  </div>
                </div>
              </div>
              <div className="font-mono text-base font-black text-emerald-800 bg-white px-3 py-1 rounded-lg border border-emerald-200" dir="ltr">
                {formatTimer(callDuration)}
              </div>
            </div>
          )}

          {stage === 'ended' && (
            <div className="p-4 bg-neutral-100 border border-neutral-300 text-neutral-800 rounded-xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">مکالمه با موفقیت به پایان رسید.</span>
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
