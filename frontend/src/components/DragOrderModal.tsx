import React, { useState, useMemo } from 'react';
import {
  X,
  GripVertical,
  Check,
  Search,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Building2,
  Phone,
  UserCheck,
  Radio,
  MoveUp,
  MoveDown,
  Info
} from 'lucide-react';
import { Contact, LdapDomain } from '../types';
import { Avatar } from './Avatar';
import { getDomainDisplayName, isWirelessLine } from '../utils/phoneUtils';

interface DragOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  ldapDomains: LdapDomain[];
  onSaveOrder: (reorderedContacts: Contact[]) => Promise<void> | void;
}

export const DragOrderModal: React.FC<DragOrderModalProps> = ({
  isOpen,
  onClose,
  contacts,
  ldapDomains,
  onSaveOrder,
}) => {
  // We work with a local copy of sorted contacts
  const [items, setItems] = useState<Contact[]>(() => {
    return [...contacts].sort((a, b) => {
      const orderA = typeof a.display_order === 'number' ? a.display_order : 999999;
      const orderB = typeof b.display_order === 'number' ? b.display_order : 999999;
      if (orderA !== orderB) return orderA - orderB;
      const nameA = [a.first_name, a.last_name].filter(Boolean).join(' ');
      const nameB = [b.first_name, b.last_name].filter(Boolean).join(' ');
      return nameA.localeCompare(nameB, 'fa');
    });
  });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync with prop when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setItems(
        [...contacts].sort((a, b) => {
          const orderA = typeof a.display_order === 'number' ? a.display_order : 999999;
          const orderB = typeof b.display_order === 'number' ? b.display_order : 999999;
          if (orderA !== orderB) return orderA - orderB;
          const nameA = [a.first_name, a.last_name].filter(Boolean).join(' ');
          const nameB = [b.first_name, b.last_name].filter(Boolean).join(' ');
          return nameA.localeCompare(nameB, 'fa');
        })
      );
      setFilterQuery('');
    }
  }, [isOpen, contacts]);

  if (!isOpen) return null;

  // Filter items for quick finding (note: drag and drop works best on full list or filtered)
  const filteredIndices = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (!filterQuery.trim()) return true;
      const q = filterQuery.toLowerCase();
      const fullName = [item.first_name, item.last_name].filter(Boolean).join(' ').toLowerCase();
      const dept = (item.department || '').toLowerCase();
      const job = (item.job_title || '').toLowerCase();
      const phone = Array.isArray(item.landlines)
        ? item.landlines.map((l) => `${l?.phone || ''} ${l?.extension || ''}`).join(' ')
        : '';
      return fullName.includes(q) || dept.includes(q) || job.includes(q) || phone.includes(q);
    });

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent or custom drag preview
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...items];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);

    // Re-assign display_order sequentially
    const withUpdatedOrders = updated.map((item, idx) => ({
      ...item,
      display_order: idx + 1,
    }));

    setItems(withUpdatedOrders);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...items];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;

    const withUpdatedOrders = updated.map((item, idx) => ({
      ...item,
      display_order: idx + 1,
    }));
    setItems(withUpdatedOrders);
  };

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return;
    const updated = [...items];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;

    const withUpdatedOrders = updated.map((item, idx) => ({
      ...item,
      display_order: idx + 1,
    }));
    setItems(withUpdatedOrders);
  };

  const handleMoveToTop = (index: number) => {
    if (index <= 0) return;
    const updated = [...items];
    const [moved] = updated.splice(index, 1);
    updated.unshift(moved);

    const withUpdatedOrders = updated.map((item, idx) => ({
      ...item,
      display_order: idx + 1,
    }));
    setItems(withUpdatedOrders);
  };

  const handleResetToAlphabetical = () => {
    const sorted = [...items].sort((a, b) => {
      const nameA = [a.first_name, a.last_name].filter(Boolean).join(' ');
      const nameB = [b.first_name, b.last_name].filter(Boolean).join(' ');
      return nameA.localeCompare(nameB, 'fa');
    });
    const withOrders = sorted.map((item, idx) => ({
      ...item,
      display_order: idx + 1,
    }));
    setItems(withOrders);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Ensure all items have clean 1-based display_order
      const finalItems = items.map((item, idx) => ({
        ...item,
        display_order: idx + 1,
      }));
      await onSaveOrder(finalItems);
      onClose();
    } catch (err) {
      console.error('Error saving order', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <span>مدیریت چیدمان و ترتیب سفارشی مخاطبین</span>
                <span className="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                  مخصوص مدیر ارشد
                </span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                با گرفتن آیکون جابجایی و کشیدن (Drag & Drop) یا دکمه‌های بالا/پایین، اولویت نمایش هر مخاطب را تعیین کنید.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200/60 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-neutral-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search inside reorder modal */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="جستجوی سریع مخاطب..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
            <button
              type="button"
              onClick={handleResetToAlphabetical}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition cursor-pointer font-medium"
              title="مرتب‌سازی الفبایی پیش‌فرض"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>چیدمان الفبایی</span>
            </button>
            <div className="text-[11px] text-neutral-500 px-2">
              تعداد کل: <span className="font-bold text-neutral-800">{items.length}</span>
            </div>
          </div>
        </div>

        {/* Tips notification */}
        <div className="bg-blue-50/60 border-b border-blue-100 px-6 py-2 flex items-center gap-2 text-xs text-blue-800">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            ترتیب تنظیم شده در اینجا به‌صورت پیش‌فرض در صفحه اصلی نمایش داده می‌شود. ردیف‌های بالاتر در رتبه اول فهرست قرار می‌گیرند.
          </span>
        </div>

        {/* Reorderable List Body */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-neutral-100 space-y-1">
          {filteredIndices.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 text-xs">
              مخاطبی مطابق عبارت جستجو یافت نشد.
            </div>
          ) : (
            filteredIndices.map(({ item, index }) => {
              const prefixText = item.prefix_title === 'ms' ? 'خانم' : item.prefix_title === 'location' ? '' : 'آقای';
              const cleanLastName = item.prefix_title === 'location' && item.last_name === '-' ? '' : (item.last_name || '');
              const fullName = [prefixText, item.first_name, cleanLastName].filter(Boolean).join(' ');
              const domainName = getDomainDisplayName(item, ldapDomains);
              const isWireless = isWirelessLine(item.landlines);
              const isDragging = draggedIndex === index;
              const isOver = dragOverIndex === index;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition select-none ${
                    isDragging
                      ? 'opacity-40 bg-blue-50 border-dashed border-blue-400'
                      : isOver
                      ? 'bg-blue-50/80 border-blue-500 shadow-sm translate-y-0.5'
                      : 'bg-white hover:bg-neutral-50 border-neutral-200/80 shadow-2xs'
                  }`}
                >
                  {/* Left: Drag Handle, Rank Badge, Avatar & Names */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Drag Handle */}
                    <div
                      className="cursor-grab active:cursor-grabbing p-1 text-neutral-400 hover:text-blue-600 hover:bg-neutral-100 rounded transition"
                      title="برای جابجایی بکشید و رها کنید"
                    >
                      <GripVertical className="w-5 h-5" />
                    </div>

                    {/* Rank Badge */}
                    <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-700 font-bold text-xs flex items-center justify-center font-mono shrink-0 border border-neutral-200">
                      {index + 1}
                    </div>

                    {/* Avatar */}
                    <Avatar
                      src={item.avatar}
                      prefix={item.prefix_title}
                      name={fullName}
                      size="sm"
                      className="shrink-0"
                    />

                    {/* Name & Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-neutral-900 truncate">
                          {fullName}
                        </span>
                        {item.contact_type === 'external' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-medium shrink-0">
                            <Building2 className="w-3 h-3" />
                            <span>{item.company_name || 'برون‌سازمانی'}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded shrink-0">
                            {domainName}
                          </span>
                        )}

                        {isWireless && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded font-medium shrink-0">
                            <Radio className="w-3 h-3 text-teal-600" />
                            <span>بی‌سیم</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-neutral-500 mt-0.5 truncate">
                        {item.job_title && <span>{item.job_title}</span>}
                        {item.department && <span>• {item.department}</span>}
                        {Array.isArray(item.landlines) && item.landlines.length > 0 && item.landlines[0] && (
                          <span className="font-mono text-[10px] text-blue-600 dir-ltr">
                            {item.landlines[0].extension ? `Ext: ${item.landlines[0].extension}` : item.landlines[0].phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Move Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveToTop(index)}
                      title="انتقال به ابتدای فهرست"
                      className="p-1 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveUp(index)}
                      title="یک پله بالاتر"
                      className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === items.length - 1}
                      onClick={() => handleMoveDown(index)}
                      title="یک پله پایین‌تر"
                      className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            تغییرات پس از کلیک روی دکمه ذخیره، در حافظه و دیتابیس سامانه ثبت خواهد شد.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-200/60 rounded-xl transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'در حال ذخیره چیدمان...' : 'ذخیره چیدمان جدید'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
