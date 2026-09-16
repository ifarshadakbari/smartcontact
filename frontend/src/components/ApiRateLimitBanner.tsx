import React, { useState } from 'react';
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  X,
  Clock,
  Gauge,
  Info,
} from 'lucide-react';
import { ApiUsageStatus } from '../types';

interface ApiRateLimitBannerProps {
  status: ApiUsageStatus;
}

export const ApiRateLimitBanner: React.FC<ApiRateLimitBannerProps> = ({ status }) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // If usage is below 75% and not showing simulator, show compact or nothing
  const shouldShowWarning = status.isApproachingLimit || status.isRateLimited;

  return (
    <>
      {/* Gentle Warning Banner at the Top of the Page */}
      {shouldShowWarning && !isDismissed && (
        <aside
          role="region"
          aria-label="وضعیت مصرف API و سقف فراخوانی"
          className={`border-b transition-all duration-300 ${
            status.isRateLimited
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
              <div className="flex items-start md:items-center gap-2.5">
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    status.isRateLimited
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {status.isRateLimited ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <Gauge className="w-4 h-4" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">
                      {status.isRateLimited
                        ? 'محدودیت موقت فراخوانی (Rate Limit Reached)'
                        : 'هشدار ملایم سقف مصرف API (Approaching Rate Limit)'}
                    </span>
                    <span
                      className={`px-2 py-0.2 rounded-full font-mono text-[10px] font-bold ${
                        status.isRateLimited
                          ? 'bg-rose-200 text-rose-900'
                          : 'bg-amber-200 text-amber-900'
                      }`}
                      dir="ltr"
                    >
                      {status.percentUsed}% Used ({status.totalCalls}/{status.limit})
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-relaxed">
                    {status.isRateLimited
                      ? 'به دلیل رسیدن به سقف مجاز، دکمه‌های پرمصرف (همگام‌سازی و تست‌های مکرر) موقتاً غیرفعال شده‌اند تا از خطای سرور جلوگیری شود.'
                      : 'مصرف فراخوانی‌ها به آستانه مجاز نزدیک شده است. دکمه‌های عملیات سنگین جهت مدیریت بهینه منابع به حالت ایمن درآمده‌اند.'}
                  </p>
                </div>
              </div>

              {/* Progress & Quick Controls */}
              <div className="flex items-center gap-3 self-end md:self-auto shrink-0 flex-wrap">
                {/* Progress bar */}
                <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-lg border border-neutral-200">
                  <div className="w-16 sm:w-24 bg-neutral-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        status.isRateLimited
                          ? 'bg-rose-600'
                          : status.percentUsed >= 85
                          ? 'bg-amber-600'
                          : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min(100, status.percentUsed)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-600">
                    {status.remainingCalls} باقی‌مانده
                  </span>
                </div>

                {/* Cooldown Timer */}
                {status.resetTimeRemainingSec > 0 && (
                  <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-700 bg-white/80 px-2 py-1 rounded-lg border border-neutral-200">
                    <Clock className="w-3 h-3 text-neutral-500 animate-spin" style={{ animationDuration: '3s' }} />
                    <span>بازنشانی در:</span>
                    <span className="font-mono font-bold" dir="ltr">
                      {status.resetTimeRemainingSec}s
                    </span>
                  </div>
                )}

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 transition cursor-pointer rounded"
                  title="بستن موقت هشدار"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Header Compact Status Pill & Interactive Simulator Drawer */}
      <div className="bg-neutral-50 border-b border-neutral-200 px-4 sm:px-6 lg:px-8 py-1">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[11px] text-neutral-600">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-semibold text-neutral-700">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>پایش بلادرنگ سرویس‌ها و سهمیه API:</span>
            </span>

            {/* Status Pill */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                status.isRateLimited
                  ? 'bg-rose-100 border-rose-300 text-rose-800'
                  : status.isApproachingLimit
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-emerald-100 border-emerald-300 text-emerald-800'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  status.isRateLimited
                    ? 'bg-rose-600'
                    : status.isApproachingLimit
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-emerald-600'
                }`}
              />
              <span dir="ltr">
                {status.percentUsed}% ({status.totalCalls}/{status.limit} req/min)
              </span>
            </span>

            {isDismissed && shouldShowWarning && (
              <button
                type="button"
                onClick={() => setIsDismissed(false)}
                className="text-amber-700 hover:underline text-[10px] font-semibold cursor-pointer"
              >
                (نمایش مجدد هشدار سقف مصرف)
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
