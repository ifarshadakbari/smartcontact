import React, { useEffect } from 'react';
import { Printer, ArrowRight, X } from 'lucide-react';
import { Contact } from '../types';

interface PrintViewProps {
  contacts: Contact[];
  onBack?: () => void;
  onClose?: () => void;
}

export const PrintView: React.FC<PrintViewProps> = ({ contacts, onBack, onClose }) => {
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
      <div className="no-print max-w-5xl mx-auto mb-6 sticky top-4 z-20 flex items-center justify-between bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-neutral-200 shadow-md">
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

        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">
            مجموع مخاطبین قابل چاپ: {contacts.length} نفر
          </span>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ برگه دفترچه تلفن (Print / PDF)</span>
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
              راهنمای هوشمند اطلاعات و ارتباطات درون و برون سازمانی
            </p>
          </div>
          <div className="text-left text-xs text-neutral-500">
            <div>تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}</div>
            <div>نسخه رسمی سازمان</div>
          </div>
        </div>

        {/* Groups */}
        <div className="space-y-6">
          {(Object.entries(groupedContacts) as [string, Contact[]][]).map(([department, list]) => (
            <div key={department} className="break-inside-avoid">
              <div className="bg-neutral-100 px-3 py-1.5 font-bold text-neutral-900 text-xs rounded mb-2 border-r-4 border-neutral-900">
                {department} ({list.length} نفر)
              </div>

              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-300 text-neutral-600 font-bold">
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
                              {c.landlines.map((l, i) => (
                                <div key={i} className="text-xs">
                                  {l.phone && (
                                    <span className="font-bold text-neutral-900">
                                      {l.phone}
                                    </span>
                                  )}
                                  {l.extension && (
                                    <span className="text-neutral-600 text-[11px] ml-1">
                                      (داخلی: {l.extension})
                                    </span>
                                  )}
                                </div>
                              ))}
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
          <span>چاپ برگه دفترچه تلفن (Print / PDF)</span>
        </button>
      </div>
    </div>
  );
};
