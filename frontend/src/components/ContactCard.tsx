import React, { useState } from 'react';
import {
  Phone,
  Smartphone,
  Mail,
  MapPin,
  Copy,
  Check,
  Star,
  ArrowUpRight,
  Building2,
  UserCheck,
  Globe,
  PhoneCall,
  Network,
  Briefcase,
  Lock,
  Shield,
  Radio,
} from 'lucide-react';
import { Contact, User, LdapDomain } from '../types';
import { Avatar } from './Avatar';
import {
  getVisibleMobiles,
  getDomainDisplayName,
  isWirelessLine,
  isPureWirelessTitle,
  isRemoteLine,
  isPureRemoteTitle,
  getNonWirelessTitle,
  getVisibleLandlines,
  isContactVoipCallable,
} from '../utils/phoneUtils';
import { getContactCreatorLabel } from '../utils/contactUtils';
import { CordlessPhoneIcon } from './CordlessPhoneIcon';
import { RemotePhoneIcon } from './RemotePhoneIcon';

interface ContactCardProps {
  contact: Contact;
  currentUser: User | null;
  allContacts?: Contact[];
  ldapDomains?: LdapDomain[];
  onSelect: (contact: Contact) => void;
  onToggleFavorite: (id: number | string) => void;
  onInitiateCall?: (targetNumber: string, contact: Contact, title?: string) => void;
  onRequireLoginForCall?: () => void;
  onFilterByCompany?: (companyName: string) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  currentUser,
  allContacts,
  ldapDomains,
  onSelect,
  onToggleFavorite,
  onInitiateCall,
  onRequireLoginForCall,
  onFilterByCompany,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const voipCheck = isContactVoipCallable(contact, ldapDomains, currentUser);

  const handleCallClick = (e: React.MouseEvent, targetNumber: string, title?: string) => {
    e.stopPropagation();
    if (!currentUser) {
      if (onRequireLoginForCall) {
        onRequireLoginForCall();
      }
      return;
    }
    if (!voipCheck.callable) {
      return;
    }
    if (onInitiateCall) {
      onInitiateCall(targetNumber, contact, title);
    }
  };

  const prefixText = contact.prefix_title === 'ms' ? 'خانم' : contact.prefix_title === 'location' ? '' : 'آقای';
  const cleanLastName = contact.prefix_title === 'location' && contact.last_name === '-' ? '' : (contact.last_name || '');
  const fullName = [contact.first_name, cleanLastName].filter(Boolean).join(' ');
  const domainDisplayName = getDomainDisplayName(contact, ldapDomains);
  const isOwner = currentUser ? contact.created_by_user_id === currentUser.id : false;
  const isAdmin = currentUser ? currentUser.role === 'admin' : false;
  const canMakeCalls = voipCheck.callable;
  const visibleLandlines = getVisibleLandlines(contact, currentUser);

  return (
    <div
      onClick={() => onSelect(contact)}
      className="group bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 hover:border-neutral-400 hover:shadow-xs transition-all duration-150 cursor-pointer flex flex-col justify-between relative"
    >
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {/* Dynamic Avatar with Uploaded photo or Gender fallback */}
            <Avatar
              src={contact.avatar}
              prefix={contact.prefix_title}
              name={fullName}
              size="md"
            />
            <div>
              <div className="flex items-center gap-1.5">
                {prefixText && (
                  <span className="text-xs font-semibold text-neutral-500">
                    {prefixText}
                  </span>
                )}
                <h3 className="text-sm font-bold text-neutral-900 leading-tight">
                  {fullName}
                </h3>
              </div>
              {contact.job_title && (
                <p className="text-xs text-neutral-600 font-medium mt-0.5">
                  {contact.job_title}
                </p>
              )}
            </div>
          </div>

          {/* Favorite Star */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(contact.id);
            }}
            className="text-neutral-300 hover:text-blue-600 transition p-1 cursor-pointer"
            title={contact.is_favorite ? 'حذف از نشان‌شده‌ها' : 'افزودن به نشان‌شده‌ها'}
          >
            <Star
              className={`w-4 h-4 ${
                contact.is_favorite
                  ? 'fill-blue-600 text-blue-600'
                  : 'stroke-[1.5]'
              }`}
            />
          </button>
        </div>

        {/* Domain / Company and Ownership Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          {/* Domain or Company Tag */}
          {contact.contact_type === 'external' ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (contact.company_name) {
                  onFilterByCompany?.(contact.company_name);
                }
              }}
              className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-300 px-2 py-0.5 rounded border border-amber-200 transition cursor-pointer"
              title="کلیک کنید تا کلیه رابط‌ها و پرسنل این شرکت فیلتر شوند"
            >
              <Building2 className="w-3 h-3 text-amber-600" />
              <span>{contact.company_name || 'شرکت طرف قرارداد'}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
              <Network className="w-3 h-3 text-blue-600" />
              <span>{domainDisplayName}</span>
            </span>
          )}

          {/* Non-AD Staff Tag (Internal without Windows PC account) */}
          {contact.contact_type !== 'external' && contact.has_ldap_account === false && (
            <span className="text-[9px] font-medium bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-200" title="پرسنل دارای تلفن رومیزی در محل کارخانه یا انبار (فاقد سیستم کامپیوتری)">
              تلفن رومیزی (بدون اکانت ویندوز)
            </span>
          )}

          {/* Public / Private Badge */}
          {contact.is_public !== false ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200">
              <Globe className="w-3 h-3 text-neutral-400" />
              <span>عمومی</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200" title="مخاطب غیرعمومی (فقط شما و ادمین)">
              <Lock className="w-3 h-3 text-amber-600" />
              <span>خصوصی</span>
            </span>
          )}

          {/* Creator Badge: "ثبت شده توسط شما" for creator, or "ثبت: نام کاربر" for admin */}
          {isOwner ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200" title="این شماره توسط حساب کاربری شما ثبت شده است">
              <UserCheck className="w-3 h-3 text-emerald-600" />
              <span>ثبت شده توسط شما</span>
            </span>
          ) : isAdmin && (contact.created_by_user_name || contact.created_by_user_id) ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded border border-neutral-200" title={`ثبت‌شده توسط: ${getContactCreatorLabel(contact, allContacts)}`}>
              <span>ثبت: {getContactCreatorLabel(contact, allContacts)}</span>
            </span>
          ) : null}
        </div>

        {/* Department & Location */}
        <div className="flex flex-wrap items-center gap-2 py-2 border-y border-neutral-100 mb-3 text-xs">
          {contact.department && (
            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
              <Building2 className="w-3 h-3 text-neutral-500" />
              <span>{contact.department}</span>
            </span>
          )}
          {contact.location && (
            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 truncate max-w-[190px]">
              <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
              <span className="truncate">{contact.location}</span>
            </span>
          )}
        </div>

        {/* Primary Fixed Line + Internal Extension Box */}
        {visibleLandlines.length > 0 && (
          <div className="space-y-2 mb-3">
            {visibleLandlines.slice(0, 2).map((item, idx) => {
              const isWireless = isWirelessLine(item.title);
              const isRemote = isRemoteLine(item.title);
              const customTitle = getNonWirelessTitle(item.title);
              const showTopTitle = Boolean(customTitle);

              return (
                <div
                  key={item.id || idx}
                  className="bg-neutral-50 rounded-lg p-2.5 border border-neutral-200 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    {showTopTitle && (
                      <div className="flex items-center gap-1 text-[10px] mb-1">
                        <span className="text-neutral-500 font-medium">{customTitle}</span>
                      </div>
                    )}
                    {/* Fixed Phone with Large Blue Style - Only if phone is registered */}
                    {item.phone && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="text-[11px] text-neutral-500 whitespace-nowrap">تلفن ثابت:</span>
                          <a
                            href={`tel:${item.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-base sm:text-lg font-black text-blue-600 font-mono tracking-wider hover:underline"
                            dir="ltr"
                          >
                            {item.phone}
                          </a>
                          {/* If there is no extension on this line, show badge next to phone */}
                          {isWireless && !item.extension && (
                            <span
                              className="inline-flex items-center gap-1 text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 font-medium text-[10.5px] whitespace-nowrap"
                              title="تلفن بی‌سیم"
                            >
                              <CordlessPhoneIcon className="w-3.5 h-3.5 text-sky-600 animate-pulse shrink-0" />
                              <span>بی‌سیم</span>
                            </span>
                          )}
                          {isRemote && !item.extension && (
                            <span
                              className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-medium text-[10.5px] whitespace-nowrap"
                              title="تلفن ریموت / دورکار"
                            >
                              <RemotePhoneIcon className="w-3.5 h-3.5 text-purple-600 animate-pulse shrink-0" />
                              <span>ریموت</span>
                            </span>
                          )}
                        </div>

                        {/* Fixed Phone Actions (Call + Copy) directly aligned with Fixed Phone */}
                        <div className="flex items-center gap-1 shrink-0 justify-end">
                          {canMakeCalls ? (
                            <button
                              type="button"
                              onClick={(e) => handleCallClick(e, item.phone, item.title || 'تلفن ثابت')}
                              className="w-8 h-8 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-emerald-700 hover:text-emerald-900 transition cursor-pointer text-xs shrink-0"
                              title="تماس مستقیم با این خط تلفن از روی IP Phone شما"
                            >
                              <PhoneCall className="w-4 h-4 text-emerald-600" />
                            </button>
                          ) : (
                            <span
                              className="w-8 h-8 flex items-center justify-center bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-400 text-xs shrink-0 cursor-not-allowed opacity-60"
                              title={voipCheck.reason || 'تماس VoIP غیرفعال است'}
                            >
                              <PhoneCall className="w-4 h-4 text-neutral-400" />
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleCopy(e, item.phone, `phone-${contact.id}-${idx}`)}
                            className="w-8 h-8 flex items-center justify-center bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg text-neutral-600 hover:text-neutral-900 transition cursor-pointer text-xs shrink-0"
                            title="کپی شماره تلفن ثابت"
                          >
                            {copiedKey === `phone-${contact.id}-${idx}` ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-neutral-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Extension in neat badge with direct click-to-call */}
                    {item.extension && (
                      <div className={`flex items-center justify-between gap-2 ${item.phone ? 'mt-1.5' : ''}`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-neutral-500 whitespace-nowrap">شماره داخلی:</span>
                          <span
                            className={`font-mono px-2 py-0.5 rounded inline-flex items-center justify-center ${
                              contact.contact_type !== 'external'
                                ? 'text-base sm:text-lg font-black text-neutral-900 bg-neutral-200/90 tracking-wider min-h-[32px]'
                                : 'font-bold text-neutral-800 bg-neutral-200/80 text-xs min-h-[26px]'
                            }`}
                            dir="ltr"
                          >
                            {item.extension}
                          </span>

                          {/* برچسب بی‌سیم همراه با آیکون اختصاصی تلفن بی‌سیم */}
                          {isWireless && (
                            <span
                              className="inline-flex items-center gap-1 text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 font-medium text-[10.5px] whitespace-nowrap shadow-xs"
                              title="تلفن داخلی بی‌سیم"
                            >
                              <CordlessPhoneIcon className="w-3.5 h-3.5 text-sky-600 animate-pulse shrink-0" />
                              <span>بی‌سیم</span>
                            </span>
                          )}

                          {/* برچسب ریموت همراه با آیکون اختصاصی ریموت */}
                          {isRemote && (
                            <span
                              className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-medium text-[10.5px] whitespace-nowrap shadow-xs"
                              title="تلفن داخلی ریموت / دورکار"
                            >
                              <RemotePhoneIcon className="w-3.5 h-3.5 text-purple-600 animate-pulse shrink-0" />
                              <span>ریموت</span>
                            </span>
                          )}
                        </div>
                        {contact.contact_type !== 'external' && (
                          canMakeCalls ? (
                            <button
                              type="button"
                              onClick={(e) => handleCallClick(e, item.extension!, `داخلی ${item.extension}`)}
                              className="w-[68px] h-8 rounded-lg border border-emerald-300 inline-flex items-center justify-center gap-1 transition cursor-pointer font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 shrink-0 text-xs"
                              title="تماس مستقیم با این داخلی از طریق IP Phone شما"
                            >
                              <PhoneCall className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="text-[11px] leading-none whitespace-nowrap">تماس</span>
                            </button>
                          ) : (
                            <span
                              className="w-[68px] h-8 rounded-lg border border-neutral-200 inline-flex items-center justify-center gap-1 font-medium text-neutral-400 bg-neutral-100 shrink-0 text-xs cursor-not-allowed opacity-60"
                              title={voipCheck.reason || 'تماس VoIP غیرفعال است'}
                            >
                              <PhoneCall className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                              <span className="text-[11px] leading-none whitespace-nowrap">تماس</span>
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile Numbers with Privacy & Personal Overlay Support */}
        {(() => {
          const visibleMobiles = getVisibleMobiles(contact, currentUser);
          if (visibleMobiles.length > 0) {
            return (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-neutral-500 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>شماره‌های همراه:</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {visibleMobiles.map((mobItem, mIdx) => (
                    <div
                      key={mIdx}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm font-mono font-bold transition shadow-2xs ${
                        mobItem.isPersonal
                          ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                          : mobItem.type === 'admin_confidential'
                          ? 'bg-neutral-100 border-neutral-300 text-neutral-900'
                          : 'bg-neutral-100 border-neutral-200 text-neutral-900 hover:bg-neutral-200/70'
                      }`}
                      dir="ltr"
                    >
                      <a
                        href={`tel:${mobItem.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-blue-600 tracking-wide"
                      >
                        {mobItem.phone}
                      </a>

                      {mobItem.isPersonal && (
                        <span
                          className="font-sans text-[9px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded flex items-center gap-0.5"
                          title="این شماره به صورت خصوصی برای این مخاطب ذخیره شده است"
                        >
                          <Lock className="w-2.5 h-2.5" />
                          <span>خصوصی</span>
                        </span>
                      )}

                      {mobItem.type === 'admin_confidential' && (
                        <span
                          className="font-sans text-[9px] bg-neutral-200 text-neutral-700 px-1 py-0.2 rounded flex items-center gap-0.5"
                          title="شماره همراه محرمانه سازمانی (دسترسی ادمین)"
                        >
                          <Shield className="w-2.5 h-2.5 text-neutral-500" />
                          <span>محرمانه</span>
                        </span>
                      )}

                      {canMakeCalls && (
                        <button
                          type="button"
                          onClick={(e) => handleCallClick(e, mobItem.phone, `موبایل ${mobItem.phone}`)}
                          className="p-1 text-emerald-600 hover:text-emerald-800 transition cursor-pointer"
                          title="شماره‌گیری این موبایل از تلفن رومیزی"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, mobItem.phone, `mob-${contact.id}-${mIdx}`)}
                        className="text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                        title="کپی شماره همراه"
                      >
                        {copiedKey === `mob-${contact.id}-${mIdx}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (contact.contact_type !== 'external' && !contact.is_mobile_public) {
            return (
              <div className="mb-3 flex items-center justify-between text-[11px] text-neutral-400 bg-neutral-50/80 px-2.5 py-1.5 rounded-lg border border-neutral-200/60">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-neutral-400" />
                  <span>شماره همراه: محرمانه درون‌سازمانی</span>
                </span>
                {currentUser && (
                  <span className="text-[10px] text-blue-600 font-medium hover:underline">
                    ثبت در دفترچه شخصی
                  </span>
                )}
              </div>
            );
          }

          return null;
        })()}

        {/* Email */}
        {contact.email && (
          <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
            <div className="flex items-center gap-1.5 truncate max-w-[200px]">
              <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <a
                href={`mailto:${contact.email}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-neutral-900 truncate font-mono text-[11px]"
                dir="ltr"
              >
                {contact.email}
              </a>
            </div>
            <button
              type="button"
              onClick={(e) => handleCopy(e, contact.email!, `email-${contact.id}`)}
              className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
              title="کپی ایمیل"
            >
              {copiedKey === `email-${contact.id}` ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer Details Button */}
      <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500 group-hover:text-blue-600 transition">
        <span className="font-medium text-[11px]">مشاهده مشخصات کامل و داخلی‌ها</span>
        <ArrowUpRight className="w-3.5 h-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </div>
  );
};

