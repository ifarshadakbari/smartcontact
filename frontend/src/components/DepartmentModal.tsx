import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Building2,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Network,
  Save,
  Database,
} from 'lucide-react';
import { Department, Contact, LaravelConfig, LdapDomain } from '../types';
import { deduplicateDepartments, normalizeDeptName } from '../utils/phoneUtils';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  contacts: Contact[];
  onSaveDepartments: (updated: Department[]) => void;
  laravelConfig?: LaravelConfig;
  ldapDomains?: LdapDomain[];
}

export const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  departments,
  contacts,
  onSaveDepartments,
  laravelConfig,
  ldapDomains = [],
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real departments (excluding the synthetic 'all' item and deduplicated)
  const realDepartments = deduplicateDepartments(departments.filter((d) => d.id !== 'all'));

  const filteredList = realDepartments.filter((d) =>
    d.name.toLowerCase().includes(searchFilter.trim().toLowerCase()) ||
    d.code.toLowerCase().includes(searchFilter.trim().toLowerCase()) ||
    (d.domain_name && d.domain_name.toLowerCase().includes(searchFilter.trim().toLowerCase()))
  );

  // Count contacts in a department (with normalized name matching)
  const getContactCount = (deptName: string) => {
    const norm = normalizeDeptName(deptName);
    return contacts.filter((c) => normalizeDeptName(c.department) === norm).length;
  };

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setNameInput('');
    setCodeInput('');
    setSelectedDomainId('');
    setErrorMsg(null);
  };

  const handleStartEdit = (dept: Department) => {
    setEditingId(dept.id);
    setIsAdding(false);
    setNameInput(dept.name);
    setCodeInput(dept.code);
    setSelectedDomainId(dept.domain_id ? String(dept.domain_id) : '');
    setErrorMsg(null);
  };

  const handleCancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setNameInput('');
    setCodeInput('');
    setSelectedDomainId('');
    setErrorMsg(null);
  };

  const handleSaveItem = () => {
    const trimmedName = nameInput.trim();
    const trimmedCode = codeInput.trim().toUpperCase();

    if (!trimmedName) {
      setErrorMsg('نام واحد سازمانی نمی‌تواند خالی باشد.');
      return;
    }

    // Check duplicate name using normalized comparison
    const isDuplicate = realDepartments.some(
      (d) => normalizeDeptName(d.name) === normalizeDeptName(trimmedName) && d.id !== editingId
    );
    if (isDuplicate) {
      setErrorMsg('واحد سازمانی با این نام از قبل وجود دارد.');
      return;
    }

    const matchedDomain = ldapDomains.find(
      (d) => String(d.id) === String(selectedDomainId) || d.name === selectedDomainId
    );

    let updatedList: Department[];
    if (isAdding) {
      const newDept: Department = {
        id: `dept-${Date.now()}`,
        name: trimmedName,
        code: trimmedCode || `D${realDepartments.length + 1}`,
        domain_id: selectedDomainId ? String(selectedDomainId) : undefined,
        domain_name: matchedDomain?.display_name || matchedDomain?.name || undefined,
      };
      // Keep 'all' item at index 0 if it exists
      const allItem = departments.find((d) => d.id === 'all') || { id: 'all', name: 'تمام واحدها', code: 'ALL' };
      updatedList = [allItem, ...realDepartments, newDept];
      setSuccessMsg(`واحد سازمانی «${trimmedName}» با موفقیت اضافه و ذخیره شد.`);
    } else if (editingId) {
      const allItem = departments.find((d) => d.id === 'all') || { id: 'all', name: 'تمام واحدها', code: 'ALL' };
      const modified = realDepartments.map((d) =>
        d.id === editingId
          ? {
              ...d,
              name: trimmedName,
              code: trimmedCode || d.code,
              domain_id: selectedDomainId ? String(selectedDomainId) : undefined,
              domain_name: matchedDomain?.display_name || matchedDomain?.name || undefined,
            }
          : d
      );
      updatedList = [allItem, ...modified];
      setSuccessMsg(`واحد سازمانی «${trimmedName}» با موفقیت در دیتابیس ویرایش شد.`);
    } else {
      return;
    }

    onSaveDepartments(updatedList);
    handleCancelForm();
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDelete = (id: string, name: string) => {
    const count = getContactCount(name);
    if (count > 0) {
      const confirmForce = window.confirm(
        `تعداد ${count} مخاطب در واحد «${name}» ثبت شده‌اند. آیا از حذف این واحد سازمانی اطمینان دارید؟`
      );
      if (!confirmForce) return;
    } else {
      const confirmDelete = window.confirm(`آیا از حذف واحد سازمانی «${name}» اطمینان دارید؟`);
      if (!confirmDelete) return;
    }

    const allItem = departments.find((d) => d.id === 'all') || { id: 'all', name: 'تمام واحدها', code: 'ALL' };
    const remaining = realDepartments.filter((d) => d.id !== id);
    onSaveDepartments([allItem, ...remaining]);
    setSuccessMsg(`واحد «${name}» با موفقیت حذف شد.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-neutral-200 text-neutral-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                مدیریت دپارتمان‌ها و واحدهای سازمانی
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                ذخیره، ویرایش و مدیریت ساختار اداری و دپارتمان‌های رسمی
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-200/50 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div className="mx-6 mt-3 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mx-6 mt-3 px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Top Bar: Add Button & Search & Reset */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="جستجو در نام، کد یا دامین واحد سازمانی..."
                className="w-full pr-9 pl-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-2">
              {!isAdding && !editingId && (
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن واحد جدید</span>
                </button>
              )}
            </div>
          </div>

          {/* Inline Add / Edit Form */}
          {(isAdding || editingId) && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">
                  {isAdding ? 'افزودن واحد سازمانی جدید' : 'ویرایش واحد سازمانی'}
                </span>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-neutral-400 hover:text-neutral-700 text-xs"
                >
                  انصراف
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    نام واحد سازمانی <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="مثال: مدیریت بازرگانی خارجی یا پروژه ERP"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    کد اختصاری واحد
                  </label>
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="مثال: ERP یا COMM"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase font-mono"
                    dir="ltr"
                  />
                </div>

                {ldapDomains.length > 0 && (
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      دامین سازمانی مرتبط (اختیاری):
                    </label>
                    <select
                      value={selectedDomainId}
                      onChange={(e) => setSelectedDomainId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">همه دامین‌ها و سراسری (بدون محدودیت دامین)</option>
                      {ldapDomains.map((dom) => (
                        <option key={dom.id} value={dom.id}>
                          {dom.display_name} ({dom.name})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200/60 rounded-lg transition"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleSaveItem}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{isAdding ? 'ثبت و ذخیره' : 'ذخیره تغییرات'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Department List */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-200 bg-white shadow-xs">
            <div className="bg-neutral-50 px-4 py-2 text-[11px] font-bold text-neutral-500 flex items-center justify-between">
              <span>نام واحد سازمانی ({filteredList.length} واحد ثبت‌شده)</span>
              <span>عملیات و پرسنل</span>
            </div>

            {filteredList.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                واحدی با این مشخصات یافت نشد.
              </div>
            ) : (
              filteredList.map((dept) => {
                const count = getContactCount(dept.name);
                const resolvedDomain = ldapDomains.find(
                  (d) =>
                    (dept.domain_id && (String(d.id) === String(dept.domain_id) || d.name === dept.domain_id)) ||
                    (dept.domain_name && (d.display_name === dept.domain_name || d.name === dept.domain_name))
                );
                const displayDomainName = resolvedDomain?.display_name || dept.domain_name;

                return (
                  <div
                    key={dept.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50/80 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-600 flex items-center justify-center text-xs font-bold font-mono">
                        {dept.code || 'DEP'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900">{dept.name}</span>
                          {displayDomainName ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                              <Network className="w-3 h-3 text-blue-600" />
                              <span>دامین: {displayDomainName}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 text-neutral-500 border border-neutral-200">
                              <span>سراسری (همه دامین‌ها)</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                          <Users className="w-3 h-3 text-neutral-400" />
                          <span>{count} مخاطب در این واحد</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(dept)}
                        className="p-1.5 text-neutral-500 hover:text-blue-600 hover:bg-neutral-100 rounded-md transition cursor-pointer"
                        title="ویرایش نام واحد"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(dept.id, dept.name)}
                        className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-md transition cursor-pointer"
                        title="حذف واحد سازمانی"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-600 text-xs leading-relaxed space-y-1">
            <p className="font-semibold text-neutral-800 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>پایگاه داده متمرکز و یکپارچگی ساختار سازمانی:</span>
            </p>
            <p>
              تمام تغییرات واحدهای سازمانی در پایگاه داده ذخیره و برای کلیه کاربران و دامین‌های فعال همگام‌سازی می‌شوند.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs text-neutral-500">
          <span>مجموع واحدهای سازمانی: {realDepartments.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-semibold transition cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
