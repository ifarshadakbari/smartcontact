import React, { useState } from 'react';
import { Copy, Check, Star, ArrowUpRight, Phone, Smartphone, MapPin, UserCheck, Globe, PhoneCall, Network, Building2, Lock, Shield, Radio, GripVertical } from 'lucide-react';
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

interface ContactTableProps {
  contacts: Contact[];
  currentUser: User | null;
  ldapDomains?: LdapDomain[];
  onSelect: (contact: Contact) => void;
  onToggleFavorite: (id: number | string) => void;
  onInitiateCall?: (targetNumber: string, contact: Contact, title?: string) => void;
  onRequireLoginForCall?: () => void;
  onFilterByCompany?: (companyName: string) => void;
  onReorder?: (reorderedContacts: Contact[]) => void;
  isCustomOrderActive?: boolean;
}

export const ContactTable: React.FC<ContactTableProps> = ({
  contacts,
  currentUser,
  ldapDomains,
  onSelect,
  onToggleFavorite,
  onInitiateCall,
  onRequireLoginForCall,
  onFilterByCompany,
  onReorder,
  isCustomOrderActive,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCallClick = (e: React.MouseEvent, targetNumber: string, contact: Contact, title?: string) => {
    e.stopPropagation();
    if (!currentUser) {
      if (onRequireLoginForCall) onRequireLoginForCall();
      return;
    }
    const check = isContactVoipCallable(contact, ldapDomains, currentUser);
    if (!check.callable) {
      return;
    }
    if (onInitiateCall) {
      onInitiateCall(targetNumber, contact, title);
    }
  };

  const isAdmin = currentUser ? currentUser.role === 'admin' : false;
  const canDrag = isAdmin && Boolean(onReorder) && Boolean(isCustomOrderActive);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!canDrag) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!canDrag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (!canDrag) return;
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...contacts];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);

    // Update display_order
    const withNewOrder = updated.map((c, idx) => ({
      ...c,
      display_order: idx + 1,
    }));

    onReorder?.(withNewOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs font-sans">
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
              {canDrag && <th className="py-3 px-2 w-8 text-center" title="جابجایی ترتیب"></th>}
              <th className="py-3 px-3 w-10 text-center"></th>
              <th className="py-3 px-4">مشخصات شخص / دامین یا شرکت</th>
              <th className="py-3 px-3">وضعیت دسترسی</th>
              <th className="py-3 px-4">سمت</th>
              <th className="py-3 px-4">واحد سازمانی</th>
              <th className="py-3 px-4">موقعیت</th>
              <th className="py-3 px-4">خط تلفن ثابت و داخلی</th>
              <th className="py-3 px-4">شماره همراه</th>
              <th className="py-3 px-4">پست الکترونیک</th>
              <th className="py-3 px-3 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {contacts.map((contact, index) => {
              const prefixText = contact.prefix_title === 'ms' ? 'خانم' : contact.prefix_title === 'location' ? '' : 'آقای';
              const cleanLastName = contact.prefix_title === 'location' && contact.last_name === '-' ? '' : (contact.last_name || '');
              const fullName = [contact.first_name, cleanLastName].filter(Boolean).join(' ');
              const domainDisplayName = getDomainDisplayName(contact, ldapDomains);
              const isOwner = currentUser ? String(contact.created_by_user_id) === String(currentUser.id) : false;
              const isDragging = draggedIndex === index;
              const isOver = dragOverIndex === index;
              const voipCheck = isContactVoipCallable(contact, ldapDomains, currentUser);
              const canMakeCalls = voipCheck.callable;
              const visibleLandlines = getVisibleLandlines(contact, currentUser);

              return (
                <tr
                  key={contact.id}
                  onClick={() => onSelect(contact)}
                  draggable={canDrag}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`transition duration-150 cursor-pointer group ${
                    isDragging
                      ? 'opacity-40 bg-blue-50'
                      : isOver
                      ? 'bg-blue-50/70 border-t-2 border-blue-600'
                      : 'hover:bg-neutral-50'
                  }`}
                >
                  {/* Drag Handle (Admin Only in Custom Order mode) */}
                  {canDrag && (
                    <td
                      className="py-3 px-2 text-center text-neutral-300 hover:text-blue-600 cursor-grab active:cursor-grabbing"
                      onClick={(e) => e.stopPropagation()}
                      title="برای تغییر چیدمان بکشید و رها کنید"
                    >
                      <GripVertical className="w-4 h-4 mx-auto" />
                    </td>
                  )}

                  {/* Favorite */}
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(contact.id);
                      }}
                      className="text-neutral-300 hover:text-blue-600 transition cursor-pointer p-1"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          contact.is_favorite
                            ? 'fill-blue-600 text-blue-600'
                            : 'stroke-[1.5]'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Name & Avatar & Domain/Company */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={contact.avatar}
                        prefix={contact.prefix_title}
                        name={fullName}
                        size="sm"
                      />
                      <div>
                        <div className="flex items-center gap-1">
                          {prefixText && (
                            <span className="text-[11px] text-neutral-400">{prefixText}</span>
                          )}
                          <span className="font-bold text-neutral-900 group-hover:text-blue-600 transition">
                            {fullName}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {contact.contact_type === 'external' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (contact.company_name) onFilterByCompany?.(contact.company_name);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 border border-amber-200 px-1.5 py-0.2 rounded transition cursor-pointer"
                              title="کلیک کنید تا کلیه رابط‌های این شرکت فیلتر شوند"
                            >
                              <Building2 className="w-2.5 h-2.5 text-amber-600" />
                              <span>{contact.company_name || 'برون‌سازمانی'}</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                              <Network className="w-2.5 h-2.5 text-blue-600" />
                              <span>{domainDisplayName}</span>
                            </span>
                          )}

                          {contact.contact_type !== 'external' && contact.has_ldap_account === false && (
                            <span className="text-[9px] text-neutral-500 bg-neutral-100 px-1.5 py-0.2 rounded border border-neutral-200" title="تلفن رومیزی در سایت (فاقد سیستم کامپیوتر)">
                              تلفن رومیزی
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Access / Ownership Scope */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {contact.is_public !== false ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                          <Globe className="w-3 h-3 text-neutral-400" />
                          <span>عمومی</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title="مخاطب غیرعمومی (فقط شما و ادمین)">
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span>خصوصی</span>
                        </span>
                      )}

                      {isOwner ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200" title="این شماره توسط حساب کاربری شما ثبت شده است">
                          <UserCheck className="w-3 h-3 text-emerald-600" />
                          <span>ثبت شده توسط شما</span>
                        </span>
                      ) : isAdmin && (contact.created_by_user_name || contact.created_by_user_id) ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200" title={`ثبت‌شده توسط: ${getContactCreatorLabel(contact, currentUser)}`}>
                          <span>ثبت: {getContactCreatorLabel(contact, currentUser)}</span>
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Job Title */}
                  <td className="py-3 px-4 font-medium text-neutral-700">
                    {contact.job_title || '-'}
                  </td>

                  {/* Department / Company */}
                  <td className="py-3 px-4">
                    {contact.contact_type === 'external' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (contact.company_name) onFilterByCompany?.(contact.company_name);
                        }}
                        className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-300 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200 transition cursor-pointer"
                        title="مشاهده همه رابط‌های این شرکت"
                      >
                        <Building2 className="w-3 h-3 text-amber-600" />
                        <span>{contact.company_name || 'برون‌سازمانی'}</span>
                      </button>
                    ) : contact.department ? (
                      <span className="inline-block bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-[11px] border border-neutral-200">
                        {contact.department}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>

                  {/* Location */}
                  <td className="py-3 px-4 text-neutral-600">
                    {contact.location ? (
                      <span className="text-[11px] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{contact.location}</span>
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>

                  {/* Fixed Lines + Extension */}
                  <td className="py-3 px-4">
                    {visibleLandlines.length > 0 ? (
                      <div className="space-y-2">
                        {visibleLandlines.map((l, idx) => {
                          const isWireless = isWirelessLine(l.title);
                          const isRemote = isRemoteLine(l.title);
                          const customTitle = getNonWirelessTitle(l.title);
                          const isInternal = contact.contact_type !== 'external';

                          if (isInternal) {
                            // درون سازمانی:
                            // ردیف اول: شماره داخلی با برچسب عنوان اختیاری و یا نمایش برچسب "بی سیم" و "ریموت" (بدون دکمه یا آیکون تماس، همراه با کپی)
                            // ردیف دوم: شماره تلفن ثابت: با اندازه کوچکتر بدون امکان تماس از طریق VoIP (آیکن تماس از طریق تلفن رومیزی حذف شود)
                            return (
                              <div key={l.id || idx} className="space-y-1 text-xs">
                                {/* ردیف اول: شماره داخلی */}
                                {l.extension ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] text-neutral-500 font-medium">داخلی:</span>
                                    <span
                                      className="font-mono text-sm font-bold bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-300 tracking-wide"
                                      dir="ltr"
                                    >
                                      {l.extension}
                                    </span>

                                    {/* برچسب بی‌سیم */}
                                    {isWireless && (
                                      <span
                                        className="inline-flex items-center gap-1 text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded border border-sky-200 font-medium whitespace-nowrap"
                                        title="تلفن داخلی بی‌سیم"
                                      >
                                        <CordlessPhoneIcon className="w-3 h-3 text-sky-600 animate-pulse" />
                                        <span>بی‌سیم</span>
                                      </span>
                                    )}

                                    {/* برچسب ریموت */}
                                    {isRemote && (
                                      <span
                                        className="inline-flex items-center gap-1 text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-medium whitespace-nowrap"
                                        title="تلفن داخلی ریموت / دورکار"
                                      >
                                        <RemotePhoneIcon className="w-3 h-3 text-purple-600 animate-pulse" />
                                        <span>ریموت</span>
                                      </span>
                                    )}

                                    {/* عنوان اختیاری خط */}
                                    {customTitle && (
                                      <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded text-neutral-500 bg-neutral-50 border border-neutral-200">
                                        {customTitle}
                                      </span>
                                    )}

                                    {/* کپی داخلی */}
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopy(e, l.extension!, `table-ext-${contact.id}-${idx}`)}
                                      className="text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                                      title="کپی داخلی"
                                    >
                                      {copiedKey === `table-ext-${contact.id}-${idx}` ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  /* اگر داخلی نداشت اما عنوان یا برچسب داشت */
                                  (isWireless || isRemote || customTitle) && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {isWireless && (
                                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-medium">
                                          <CordlessPhoneIcon className="w-3 h-3 text-sky-600 animate-pulse" />
                                          <span>بی‌سیم</span>
                                        </span>
                                      )}
                                      {isRemote && (
                                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                                          <RemotePhoneIcon className="w-3 h-3 text-purple-600 animate-pulse" />
                                          <span>ریموت</span>
                                        </span>
                                      )}
                                      {customTitle && (
                                        <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded text-neutral-500 bg-neutral-50 border border-neutral-200">
                                          {customTitle}
                                        </span>
                                      )}
                                    </div>
                                  )
                                )}

                                {/* ردیف دوم: شماره تلفن ثابت با اندازه کوچکتر بدون امکان تماس از طریق VoIP */}
                                {l.phone && (
                                  <div className="flex items-center gap-1.5 text-neutral-500 text-xs">
                                    <span className="text-[10.5px]">تلفن ثابت:</span>
                                    <span className="font-mono text-xs text-neutral-700 tracking-wider font-semibold" dir="ltr">
                                      {l.phone}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopy(e, l.phone, `table-phone-${contact.id}-${idx}`)}
                                      className="text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                                      title="کپی تلفن ثابت"
                                    >
                                      {copiedKey === `table-phone-${contact.id}-${idx}` ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          } else {
                            // برون سازمانی:
                            // ردیف اول: شماره تلفن ثابت با برچسب عنوان اختیاری و سمت چپ آن آیکن تماس و کپی
                            // ردیف دوم: شماره داخلی با اندازه کوچکتر (بدون درج دکمه آیکون تماس)
                            return (
                              <div key={l.id || idx} className="space-y-1 text-xs">
                                {/* ردیف اول: شماره تلفن ثابت */}
                                {l.phone ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] text-neutral-500 font-medium">تلفن:</span>
                                    <span
                                      className="font-bold text-blue-600 font-mono text-sm tracking-wide"
                                      dir="ltr"
                                    >
                                      {l.phone}
                                    </span>

                                    {/* برچسب عنوان اختیاری */}
                                    {customTitle && (
                                      <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded text-neutral-500 bg-neutral-50 border border-neutral-200">
                                        {customTitle}
                                      </span>
                                    )}

                                    {/* سمت چپ: آیکون تماس و کپی */}
                                    <div className="inline-flex items-center gap-1">
                                      {canMakeCalls ? (
                                        <button
                                          type="button"
                                          onClick={(e) => handleCallClick(e, l.phone, contact, l.title || 'تلفن ثابت')}
                                          className="p-0.5 cursor-pointer text-emerald-600 hover:text-emerald-800"
                                          title="تماس مستقیم از تلفن رومیزی شما"
                                        >
                                          <PhoneCall className="w-3.5 h-3.5" />
                                        </button>
                                      ) : (
                                        <span
                                          className="p-0.5 text-neutral-300 cursor-not-allowed"
                                          title={voipCheck.reason || 'تماس VoIP غیرفعال است'}
                                        >
                                          <PhoneCall className="w-3.5 h-3.5" />
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={(e) => handleCopy(e, l.phone, `table-phone-${contact.id}-${idx}`)}
                                        className="text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                                        title="کپی تلفن ثابت"
                                      >
                                        {copiedKey === `table-phone-${contact.id}-${idx}` ? (
                                          <Check className="w-3 h-3 text-emerald-600" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* اگر شماره ثابت نداشت اما عنوان داشت */
                                  customTitle && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded text-neutral-500 bg-neutral-50 border border-neutral-200">
                                        {customTitle}
                                      </span>
                                    </div>
                                  )
                                )}

                                {/* ردیف دوم: شماره داخلی با اندازه کوچکتر (بدون درج دکمه آیکون تماس) */}
                                {l.extension && (
                                  <div className="flex items-center gap-1.5 text-neutral-500 text-xs">
                                    <span className="text-[10.5px]">داخلی:</span>
                                    <span
                                      className="font-mono text-xs font-semibold bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded border border-neutral-200"
                                      dir="ltr"
                                    >
                                      {l.extension}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopy(e, l.extension!, `table-ext-${contact.id}-${idx}`)}
                                      className="text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                                      title="کپی داخلی"
                                    >
                                      {copiedKey === `table-ext-${contact.id}-${idx}` ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        })}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>

                  {/* Mobiles (Slightly larger display with Privacy Support) */}
                  <td className="py-3 px-4">
                    {(() => {
                      const visibleMobiles = getVisibleMobiles(contact, currentUser);
                      if (visibleMobiles.length > 0) {
                        return (
                          <div className="space-y-1.5">
                            {visibleMobiles.map((mobItem, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center gap-1.5 font-mono text-sm font-bold px-1.5 py-0.5 rounded border ${
                                  mobItem.isPersonal
                                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                                    : mobItem.type === 'admin_confidential'
                                    ? 'bg-neutral-100 border-neutral-300 text-neutral-800'
                                    : 'bg-neutral-50/50 border-transparent text-neutral-900'
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
                                    className="font-sans text-[9px] bg-amber-200 text-amber-900 px-1 rounded flex items-center gap-0.5"
                                    title="شماره همراه خصوصی"
                                  >
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>خصوصی</span>
                                  </span>
                                )}

                                {mobItem.type === 'admin_confidential' && (
                                  <span
                                    className="font-sans text-[9px] bg-neutral-200 text-neutral-700 px-1 rounded flex items-center gap-0.5"
                                    title="محرمانه سازمانی (دسترسی ادمین)"
                                  >
                                    <Shield className="w-2.5 h-2.5" />
                                    <span>محرمانه</span>
                                  </span>
                                )}

                                {canMakeCalls && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleCallClick(e, mobItem.phone, contact, `موبایل ${mobItem.phone}`)}
                                    className="p-0.5 cursor-pointer text-emerald-600 hover:text-emerald-800"
                                    title="شماره‌گیری این موبایل از تلفن رومیزی"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => handleCopy(e, mobItem.phone, `table-mob-${contact.id}-${idx}`)}
                                  className="text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                                  title="کپی شماره همراه"
                                >
                                  {copiedKey === `table-mob-${contact.id}-${idx}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      }

                      if (contact.contact_type !== 'external' && !contact.is_mobile_public) {
                        return (
                          <span className="text-[11px] text-neutral-400 flex items-center gap-1 font-sans">
                            <Lock className="w-3 h-3 text-neutral-400" />
                            <span>محرمانه</span>
                          </span>
                        );
                      }

                      return '-';
                    })()}
                  </td>

                  {/* Email */}
                  <td className="py-3 px-4 font-mono text-[11px] text-neutral-600" dir="ltr">
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-blue-600 truncate max-w-[140px] block"
                      >
                        {contact.email}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>

                  {/* Detail Action */}
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
                      title="مشاهده شناسنامه و جزئیات"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
