import React, { useState, useEffect } from 'react';
import { Printer, ArrowRight, X, LayoutGrid, FileText } from 'lucide-react';
import { Contact, LdapDomain } from '../types';
import { getDomainDisplayName, isWirelessLine, isRemoteLine, getNonWirelessTitle } from '../utils/phoneUtils';

interface PrintViewProps {
  contacts: Contact[];
  ldapDomains?: LdapDomain[];
  onBack?: () => void;
  onClose?: () => void;
}

export const PrintView: React.FC<PrintViewProps> = ({ contacts, ldapDomains, onBack, onClose }) => {
  const [printMode, setPrintMode] = useState<'full' | 'compact'>('full');

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onBack) {
      onBack();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Listen for Escape key to easily return
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onBack]);

  // Group contacts by department
  const groupedContacts = contacts.reduce((acc, contact) => {
    const dept = contact.department || 'سایر واحدها';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(contact);
    return acc;
  }, {} as Record<string, Contact[]>);

  return (
    <div className="min-h-screen bg-neutral-100 p-4 sm:p-8 font-sans">
      {/* Top Action Bar (Hidden on print) */}
      <div className="no-print max-w-5xl mx-auto mb-6 sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-neutral-200 shadow-md">
        <button
          id="btn-return-to-site"
          type="button"
          onClick={handleClose}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-95"
          title="بازگشت به سامانه دفترچه تلفن (یا فشردن کلید Esc)"
        >
          <ArrowRight className="w-4 h-4 text-neutral-700" />
          <span>بازگشت به سامانه</span>
          <span className="text-[10px] bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded font-mono hidden sm:inline" dir="ltr">
            Esc
          </span>
        </button>

        {/* Print Mode Selector */}
        <div className="inline-flex items-center bg-neutral-100 p-1 rounded-lg border border-neutral-200">
          <button
            type="button"
            onClick={() => setPrintMode('full')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              printMode === 'full'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>چاپ کامل (جامع)</span>
          </button>
          <button
            type="button"
            onClick={() => setPrintMode('compact')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              printMode === 'compact'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
            <span>چاپ فشرده (خلاصه داخلی‌ها)</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500 hidden md:inline">
            مجموع مخاطبین: {contacts.length} نفر
          </span>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ برگه (Print / PDF)</span>
          </button>
        </div>
      </div>

      {/* Printable Paper Canvas */}
      <div className="max-w-5xl mx-auto bg-white border border-neutral-300 rounded-xl p-8 shadow-sm print:shadow-none print:border-none print:p-0">
        {/* Document Header */}
        <div className="border-b-2 border-neutral-900 pb-4 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-neutral-900">
              سیستم جامع اطلاعات و ارتباطات سازمانی
            </h1>
            <p className="text-xs text-neutral-600 mt-1">
              {printMode === 'compact'
                ? 'راهنمای سریع و فشرده شماره‌های داخلی سازمان'
                : 'راهنمای جامع اطلاعات و ارتباطات درون و برون سازمانی'}
            </p>
          </div>
          <div className="text-left text-xs text-neutral-500">
            <div>تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}</div>
            <div>نسخه رسمی سازمان ({printMode === 'compact' ? 'فشرده' : 'کامل'})</div>
          </div>
        </div>

        {/* Groups */}
        <div className="space-y-6">
          {(Object.entries(groupedContacts) as [string, Contact[]][]).map(([department, list]) => (
            <div key={department} className="break-inside-avoid">
              <div className="bg-neutral-100 px-3 py-1.5 font-bold text-neutral-900 text-xs rounded mb-2 border-r-4 border-neutral-900">
                {department} ({list.length} نفر)
              </div>

              {printMode === 'compact' ? (
                /* Compact Table Layout */
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-300 text-neutral-600 font-bold bg-neutral-50">
                      <th className="py-2 px-2 w-1/4">دامین / شرکت</th>
                      <th className="py-2 px-2 w-1/4">نام و نام خانوادگی</th>
                      <th className="py-2 px-2 w-1/4">سمت</th>
                      <th className="py-2 px-2 w-1/4 text-center">شماره داخلی / خط</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {list.map((c) => {
                      const prefix = c.prefix_title === 'ms' ? 'خانم' : c.prefix_title === 'location' ? '' : 'آقای';
                      const domainName = c.contact_type === 'external' ? (c.company_name || 'طرف قرارداد') : getDomainDisplayName(c, ldapDomains);
                      const exts = (c.landlines || [])
                        .filter((l) => l.extension || l.phone)
                        .map((l) => {
                          const tag = isWirelessLine(l.title) ? ' (بی‌سیم)' : isRemoteLine(l.title) ? ' (ریموت)' : '';
                          return l.extension ? `${l.extension}${tag}` : l.phone;
                        })
                        .join(' ، ');

                      return (
                        <tr key={c.id} className="hover:bg-neutral-50">
                          <td className="py-1.5 px-2 text-neutral-600 font-medium text-[11px]">{domainName}</td>
                          <td className="py-1.5 px-2 font-bold text-neutral-900">
                            {prefix && <span className="text-neutral-500 font-normal text-[11px] ml-1">{prefix}</span>}
                            {c.first_name} {c.last_name}
                          </td>
                          <td className="py-1.5 px-2 text-neutral-700">{c.job_title || '-'}</td>
                          <td className="py-1.5 px-2 font-mono font-bold text-neutral-900 text-center text-sm" dir="ltr">
                            {exts || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                /* Full Table Layout */
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-300 text-neutral-600 font-bold bg-neutral-50">
                      <th className="py-2 px-2">نام و نام خانوادگی</th>
                      <th className="py-2 px-2">سمت</th>
                      <th className="py-2 px-2">موقعیت</th>
                      <th className="py-2 px-2">خط تلفن ثابت و داخلی</th>
                      <th className="py-2 px-2">شماره همراه</th>
                      <th className="py-2 px-2">پست الکترونیک</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {list.map((c) => {
                      const prefix = c.prefix_title === 'ms' ? 'خانم' : c.prefix_title === 'location' ? '' : 'آقای';
                      return (
                        <tr key={c.id} className="hover:bg-neutral-50">
                          <td className="py-1.5 px-2 font-bold text-neutral-900">
                            {prefix && <span className="text-neutral-500 font-normal text-[11px] ml-1">{prefix}</span>}
                            {c.first_name} {c.last_name}
                          </td>
                          <td className="py-1.5 px-2 text-neutral-700">{c.job_title || '-'}</td>
                          <td className="py-1.5 px-2 text-neutral-700 text-[11px]">{c.location || '-'}</td>
                          <td className="py-1.5 px-2 font-mono text-neutral-900" dir="ltr">
                            {c.landlines && c.landlines.length > 0 ? (
                              <div className="space-y-0.5">
                                {c.landlines.map((l, i) => {
                                  const tag = isWirelessLine(l.title) ? ' [بی‌سیم]' : isRemoteLine(l.title) ? ' [ریموت]' : '';
                                  return (
                                    <div key={i} className="text-xs">
                                      {l.phone && (
                                        <span className="font-bold text-neutral-900">
                                          {l.phone}
                                        </span>
                                      )}
                                      {l.extension && (
                                        <span className="text-neutral-600 text-[11px] ml-1">
                                          (داخلی: {l.extension}{tag})
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-1.5 px-2 font-mono text-neutral-900 font-semibold text-xs" dir="ltr">
                            {c.mobiles && c.mobiles.length > 0 ? c.mobiles.join(' - ') : '-'}
                          </td>
                          <td className="py-1.5 px-2 text-neutral-600 text-[11px]" dir="ltr">
                            {c.email || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action Bar (Hidden on print) */}
      <div className="no-print max-w-5xl mx-auto mt-6 flex items-center justify-between bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
        <button
          id="btn-return-to-site-bottom"
          type="button"
          onClick={handleClose}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-95"
        >
          <ArrowRight className="w-4 h-4 text-neutral-700" />
          <span>بازگشت به سامانه</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs active:scale-95"
        >
          <Printer className="w-4 h-4" />
          <span>چاپ برگه ({printMode === 'compact' ? 'فشرده' : 'کامل'})</span>
        </button>
      </div>
    </div>
  );
};

