import React, { useState, useEffect } from 'react';
import { Printer, ArrowRight, LayoutGrid, FileText, Columns2, Columns3 } from 'lucide-react';
import { Contact, LdapDomain } from '../types';
import { getDomainDisplayName, isWirelessLine, isRemoteLine } from '../utils/phoneUtils';

interface PrintViewProps {
  contacts: Contact[];
  ldapDomains?: LdapDomain[];
  onBack?: () => void;
  onClose?: () => void;
}

export const PrintView: React.FC<PrintViewProps> = ({ contacts, ldapDomains, onBack, onClose }) => {
  const [printMode, setPrintMode] = useState<'full' | 'compact'>('compact');
  const [columns, setColumns] = useState<1 | 2 | 3>(2);

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
    <div className="min-h-screen bg-neutral-100 p-4 sm:p-8 font-sans print:bg-white print:p-0">
      {/* Top Action Bar (Hidden on print) */}
      <div className="no-print max-w-6xl mx-auto mb-6 sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-neutral-200 shadow-md">
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

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Column Count Selector */}
          <div className="inline-flex items-center bg-neutral-100 p-1 rounded-lg border border-neutral-200">
            <span className="text-[11px] font-semibold text-neutral-500 px-2">تعداد ستون:</span>
            <button
              type="button"
              onClick={() => setColumns(1)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                columns === 1
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              title="چاپ تک ستونه"
            >
              <FileText className="w-3.5 h-3.5 text-neutral-600" />
              <span>تک‌ستونه</span>
            </button>
            <button
              type="button"
              onClick={() => setColumns(2)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                columns === 2
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              title="چاپ دو ستونه (پیش‌فرض پیشنهادی)"
            >
              <Columns2 className="w-3.5 h-3.5 text-blue-600" />
              <span>دوستونه</span>
            </button>
            <button
              type="button"
              onClick={() => setColumns(3)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                columns === 3
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              title="چاپ سه ستونه (فشرده)"
            >
              <Columns3 className="w-3.5 h-3.5 text-emerald-600" />
              <span>سه‌ستونه</span>
            </button>
          </div>

          {/* Print Mode Selector */}
          <div className="inline-flex items-center bg-neutral-100 p-1 rounded-lg border border-neutral-200">
            <button
              type="button"
              onClick={() => setPrintMode('compact')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                printMode === 'compact'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
              <span>خلاصه داخلی‌ها (فشرده)</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('full')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                printMode === 'full'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>کامل (همراه موبایل و ایمیل)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500 hidden md:inline">
            مجموع: {contacts.length} مخاطب
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
      <div className="max-w-6xl mx-auto bg-white border border-neutral-300 rounded-xl p-6 sm:p-8 shadow-sm print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full">
        {/* Document Header */}
        <div className="border-b-2 border-neutral-900 pb-3 mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-neutral-900">
              سیستم جامع اطلاعات و ارتباطات سازمانی
            </h1>
            <p className="text-xs text-neutral-600 mt-1">
              {printMode === 'compact'
                ? `راهنمای سریع شماره‌های داخلی و خطوط ارتباطی سازمان (${columns} ستونه)`
                : `راهنمای جامع اطلاعات و ارتباطات درون و برون سازمانی (${columns} ستونه)`}
            </p>
          </div>
          <div className="text-left text-xs text-neutral-600">
            <div>تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}</div>
            <div className="text-[11px] text-neutral-500 font-mono">تعداد: {contacts.length} مخاطب</div>
          </div>
        </div>

        {/* Multi-Column Layout for Groups */}
        <div
          className={
            columns === 3
              ? 'columns-1 sm:columns-2 lg:columns-3 print:columns-3 gap-4'
              : columns === 2
              ? 'columns-1 md:columns-2 print:columns-2 gap-5'
              : 'columns-1'
          }
        >
          {(Object.entries(groupedContacts) as [string, Contact[]][]).map(([department, list]) => (
            <div
              key={department}
              className="break-inside-avoid inline-block w-full align-top mb-4 border border-neutral-300 rounded-lg overflow-hidden bg-white shadow-2xs print:shadow-none"
            >
              {/* Department Header */}
              <div className="bg-neutral-100 px-3 py-1.5 font-bold text-neutral-900 text-xs border-b border-neutral-300 flex items-center justify-between">
                <span>{department}</span>
                <span className="text-[11px] text-neutral-500 font-normal">({list.length})</span>
              </div>

              {printMode === 'compact' ? (
                /* Compact Table Layout */
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-600 font-bold bg-neutral-50 text-[11px]">
                      <th className="py-1 px-2">نام و سمت</th>
                      <th className="py-1 px-2 text-center">شماره داخلی / خط</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {list.map((c) => {
                      const prefix = c.prefix_title === 'ms' ? 'خانم' : c.prefix_title === 'location' ? '' : 'آقای';
                      const domainName = c.contact_type === 'external' ? (c.company_name || 'برون‌سازمانی') : getDomainDisplayName(c, ldapDomains);
                      const exts = (c.landlines || [])
                        .filter((l) => l.extension || l.phone)
                        .map((l) => {
                          const tag = isWirelessLine(l.title) ? ' (بی‌سیم)' : isRemoteLine(l.title) ? ' (ریموت)' : '';
                          return l.extension ? `${l.extension}${tag}` : l.phone;
                        })
                        .join(' ، ');

                      return (
                        <tr key={c.id} className="hover:bg-neutral-50">
                          <td className="py-1.5 px-2">
                            <div className="font-bold text-neutral-900 text-[11px]">
                              {prefix && <span className="text-neutral-500 font-normal ml-0.5">{prefix}</span>}
                              {c.first_name} {c.last_name}
                            </div>
                            <div className="text-[10px] text-neutral-500 flex items-center gap-1.5 flex-wrap">
                              {c.job_title && <span>{c.job_title}</span>}
                              {domainName && (
                                <span className="bg-neutral-100 text-neutral-600 px-1 rounded text-[9px]">
                                  {domainName}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-1.5 px-2 font-mono font-bold text-neutral-900 text-center text-xs" dir="ltr">
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
                    <tr className="border-b border-neutral-200 text-neutral-600 font-bold bg-neutral-50 text-[10px]">
                      <th className="py-1 px-1.5">نام و مشخصات</th>
                      <th className="py-1 px-1.5">خط تلفن / داخلی</th>
                      <th className="py-1 px-1.5">شماره همراه</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {list.map((c) => {
                      const prefix = c.prefix_title === 'ms' ? 'خانم' : c.prefix_title === 'location' ? '' : 'آقای';
                      return (
                        <tr key={c.id} className="hover:bg-neutral-50">
                          <td className="py-1.5 px-1.5">
                            <div className="font-bold text-neutral-900 text-[11px]">
                              {prefix && <span className="text-neutral-500 font-normal ml-0.5">{prefix}</span>}
                              {c.first_name} {c.last_name}
                            </div>
                            <div className="text-[10px] text-neutral-500">
                              {c.job_title || ''}
                              {c.location ? ` - ${c.location}` : ''}
                            </div>
                          </td>
                          <td className="py-1.5 px-1.5 font-mono text-neutral-900 text-[10px]" dir="ltr">
                            {c.landlines && c.landlines.length > 0 ? (
                              <div className="space-y-0.5">
                                {c.landlines.map((l, i) => {
                                  const tag = isWirelessLine(l.title) ? ' [بی‌سیم]' : isRemoteLine(l.title) ? ' [ریموت]' : '';
                                  return (
                                    <div key={i} className="text-[10px] whitespace-nowrap">
                                      {l.phone && <span className="font-semibold text-neutral-900">{l.phone}</span>}
                                      {l.extension && (
                                        <span className="text-neutral-600 font-bold ml-1">
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
                          <td className="py-1.5 px-1.5 font-mono text-neutral-900 text-[10px]" dir="ltr">
                            {c.mobiles && c.mobiles.length > 0 ? c.mobiles.join(', ') : '-'}
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
      <div className="no-print max-w-6xl mx-auto mt-6 flex items-center justify-between bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
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
          <span>چاپ برگه ({columns} ستونه)</span>
        </button>
      </div>
    </div>
  );
};


