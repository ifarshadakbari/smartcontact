import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Phone,
  LogOut,
  Server,
  Network,
  User as UserIcon,
  Building2,
  LogIn,
  Users,
  Activity,
  Sliders,
  ChevronDown,
  CheckCircle2,
  Settings,
  ArrowUpDown,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { User, LaravelConfig, LdapDomain } from '../types';
import { PorsaLinkLogo } from './PorsaLinkLogo';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onOpenLogin?: () => void;
  laravelConfig: LaravelConfig;
  onOpenLaravelSettings: () => void;
  totalContacts: number;
  favoritesCount: number;
  departmentsCount: number;
  ldapDomains?: LdapDomain[];
  ldapDomainsCount?: number;
  onOpenLdapSettings?: () => void;
  onOpenDepartmentSettings?: () => void;
  canViewBlf?: boolean;
  isBlfOpen?: boolean;
  onToggleBlf?: () => void;
  onOpenBlfConfig?: () => void;
  onOpenDragOrderModal?: () => void;
  onOpenHelpTour?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onOpenLogin,
  laravelConfig,
  onOpenLaravelSettings,
  totalContacts,
  favoritesCount,
  departmentsCount,
  ldapDomains = [],
  ldapDomainsCount = 3,
  onOpenLdapSettings,
  onOpenDepartmentSettings,
  canViewBlf = false,
  isBlfOpen = false,
  onToggleBlf,
  onOpenBlfConfig,
  onOpenDragOrderModal,
  onOpenHelpTour,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute Persian title for user's domain
  const userDomainDisplayTitle = useMemo(() => {
    if (!user?.domain) return 'دامین سازمانی';
    const found = ldapDomains.find(
      (d) =>
        d.id === user.domain ||
        (d.name || '').toLowerCase() === (user?.domain || '').toLowerCase()
    );
    return found?.display_name || user.domain;
  }, [user, ldapDomains]);

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-30 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & System Name */}
          <div className="flex items-center gap-3 shrink-0">
            <PorsaLinkLogo className="w-10 h-10 shrink-0 drop-shadow-xs" />
            <div>
              <h1 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight whitespace-nowrap">
                پُــرسا لینک
              </h1>
              <p className="text-[11px] text-neutral-500 hidden sm:block whitespace-nowrap">
                سیستم هوشمند اطلاعات و ارتباطات درون و برون سازمانی
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hidden lg:flex items-center gap-5 border-x border-neutral-200 px-6 mx-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-500">مخاطبین ثبت‌شده:</span>
              <span className="font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
                {totalContacts} مورد
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-500">دامین‌های سازمانی:</span>
              <span className="font-bold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded font-mono">
                {ldapDomainsCount}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-500">نشان‌شده‌ها:</span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {favoritesCount}
              </span>
            </div>
          </div>

          {/* User Profile & Dropdown Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Help & Tour Trigger Button (Always visible for all users) */}
            {onOpenHelpTour && (
              <button
                type="button"
                onClick={onOpenHelpTour}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-800 text-xs font-bold transition shadow-2xs cursor-pointer select-none"
                title="راهنمای تعاملی، تور آموزشی، ویدئو معرفی و پاسخ به پرسش‌ها"
              >
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">راهنما و تور آموزشی</span>
              </button>
            )}

            {/* Authenticated User */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                {/* Profile Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-2 rounded-xl transition cursor-pointer select-none border ${
                    isDropdownOpen
                      ? 'bg-neutral-100 border-neutral-300 shadow-2xs'
                      : 'hover:bg-neutral-50 border-neutral-200/80'
                  }`}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  title="منوی کاربری و تنظیمات سامانه"
                >
                  {/* Avatar with User Icon */}
                  <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <UserIcon className="w-4 h-4 text-white" />
                  </div>

                  {/* Name and Persian Domain Title */}
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-neutral-900 leading-tight">
                        {user.name}
                      </span>
                      {user.role === 'admin' ? (
                        <span className="text-[9px] bg-neutral-900 text-white px-1.5 py-0.2 rounded font-semibold">
                          مدیر سیستم
                        </span>
                      ) : (
                        <span className="text-[9px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.2 rounded font-semibold">
                          پرسنل
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 leading-tight mt-1">
                      {/* Persian Domain Title Styled like Contact Card Badge */}
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 shadow-2xs">
                        <Network className="w-2.5 h-2.5 text-blue-600" />
                        <span>{userDomainDisplayTitle}</span>
                      </span>
                      {user.extension && (
                        <>
                          <span className="text-neutral-300">•</span>
                          <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                            <span>داخلی</span>
                            <span className="font-semibold tracking-wide" dir="ltr">{user.extension}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Dropdown Chevron */}
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                      isDropdownOpen ? 'rotate-180 text-neutral-800' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Content Card */}
                {isDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2.5 z-50 text-right animate-in fade-in slide-in-from-top-2 duration-150 font-sans">
                    {/* Header info */}
                    <div className="px-4 py-2.5 border-b border-neutral-100 bg-neutral-50/70 -mt-2.5 rounded-t-2xl mb-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-neutral-900">{user.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            user.role === 'admin'
                              ? 'bg-neutral-900 text-white'
                              : 'bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          {user.role === 'admin' ? 'مدیر ارشد سامانه' : 'پرسنل سازمانی'}
                        </span>
                      </div>

                      {/* Persian Domain title badge */}
                      <div className="mt-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                          <Network className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-bold">{userDomainDisplayTitle}</span>
                        </span>
                      </div>

                      {/* Department and Extension */}
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-500">
                        <span>{user.department || 'واحد سازمانی'}</span>
                        {user.extension && (
                          <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50/90 px-2 py-0.5 rounded-md border border-emerald-200 font-medium">
                            <span>داخلی</span>
                            <span className="font-semibold tracking-wide" dir="ltr">{user.extension}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* BLF Monitoring & Telephony Group */}
                    <div className="py-1">
                      <div className="px-3.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        خدمات تلفنی و مانیتورینگ
                      </div>

                      {/* BLF Monitoring Toggle */}
                      {canViewBlf && onToggleBlf && (
                        <button
                          type="button"
                          onClick={() => {
                            onToggleBlf();
                            setIsDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-right flex items-center justify-between hover:bg-neutral-100 transition cursor-pointer text-xs group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 group-hover:bg-emerald-100">
                              <Activity className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-neutral-900">مانیتورینگ BLF</div>
                              <div className="text-[10px] text-neutral-500">مشاهده بلادرنگ وضعیت آزاد/مشغول خطوط</div>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isBlfOpen
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            {isBlfOpen ? 'فعال' : 'بسته'}
                          </span>
                        </button>
                      )}

                      {/* Admin: BLF Settings */}
                      {user.role === 'admin' && onOpenBlfConfig && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenBlfConfig();
                            setIsDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-right flex items-center justify-between hover:bg-neutral-100 transition cursor-pointer text-xs group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 border border-neutral-200 group-hover:bg-neutral-200">
                              <Sliders className="w-4 h-4 text-emerald-700" />
                            </div>
                            <div>
                              <div className="font-semibold text-neutral-900">تنظیمات و تخصیص BLF</div>
                              <div className="text-[10px] text-neutral-500">تعیین خطوط قابل مشاهده برای هر کاربر</div>
                            </div>
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Admin Infrastructure Settings Group */}
                    {user.role === 'admin' && (
                      <div className="py-1 border-t border-neutral-100 mt-1">
                        <div className="px-3.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          مدیریت سیستم و زیرساخت
                        </div>

                        {/* LDAP & VoIP Domains */}
                        {onOpenLdapSettings && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenLdapSettings();
                              setIsDropdownOpen(false);
                            }}
                            className="w-full px-4 py-2 text-right flex items-center justify-between hover:bg-neutral-100 transition cursor-pointer text-xs group"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200 group-hover:bg-blue-100">
                                <Network className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-semibold text-neutral-900">دامین‌های LDAP و ویپ</div>
                                <div className="text-[10px] text-neutral-500">Active Directory و سرورهای ایزابل</div>
                              </div>
                            </div>
                            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                              {ldapDomainsCount}
                            </span>
                          </button>
                        )}

                        {/* Departments */}
                        {onOpenDepartmentSettings && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenDepartmentSettings();
                              setIsDropdownOpen(false);
                            }}
                            className="w-full px-4 py-2 text-right flex items-center justify-between hover:bg-neutral-100 transition cursor-pointer text-xs group"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 border border-neutral-200 group-hover:bg-neutral-200">
                                <Building2 className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-neutral-900">واحدهای سازمانی</div>
                                <div className="text-[10px] text-neutral-500">تعریف و ویرایش دپارتمان‌ها</div>
                              </div>
                            </div>
                            <span className="bg-neutral-200 text-neutral-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                              {departmentsCount}
                            </span>
                          </button>
                        )}

                        {/* Reorder Contacts / Drag & Drop Layout Modal */}
                        {onOpenDragOrderModal && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenDragOrderModal();
                              setIsDropdownOpen(false);
                            }}
                            className="w-full px-4 py-2 text-right flex items-center justify-between hover:bg-neutral-100 transition cursor-pointer text-xs group"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200 group-hover:bg-purple-100">
                                <ArrowUpDown className="w-4 h-4 text-purple-700" />
                              </div>
                              <div>
                                <div className="font-semibold text-neutral-900">مدیریت چیدمان مخاطبین</div>
                                <div className="text-[10px] text-neutral-500">ترتیب سفارشی کشیدن و رها کردن (Drag & Drop)</div>
                              </div>
                            </div>
                            <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                              سفارشی
                            </span>
                          </button>
                        )}

                        {/* Laravel API Connection */}
                        <button
                          type="button"
                          onClick={() => {
                            onOpenLaravelSettings();
                            setIsDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-right flex items-center justify-between hover:bg-neutral-100 transition cursor-pointer text-xs group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0 border border-neutral-200 group-hover:bg-neutral-200">
                              <Server className="w-4 h-4 text-neutral-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-neutral-900">تنظیمات وب‌سرویس و پایگاه داده</div>
                              <div className="text-[10px] text-neutral-500">آدرس سرور API و اتصال پایگاه داده</div>
                            </div>
                          </div>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              laravelConfig.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    {/* Interactive Help & Tour Modal */}
                    {onOpenHelpTour && (
                      <div className="py-1 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={() => {
                            onOpenHelpTour();
                            setIsDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-right flex items-center justify-between hover:bg-neutral-100 transition cursor-pointer text-xs group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200 group-hover:bg-blue-100">
                              <HelpCircle className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-neutral-900">راهنمای تعاملی و تور آموزشی</div>
                              <div className="text-[10px] text-neutral-500">ویدئو، بارکد موبایل و تور گام‌به‌گام</div>
                            </div>
                          </div>
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            ۴ بخش
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Logout Option */}
                    <div className="pt-1 border-t border-neutral-100 mt-1">
                      <button
                        id="logout-btn"
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full px-4 py-2.5 text-right flex items-center gap-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer text-xs font-semibold"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>خروج از حساب کاربری</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Guest Visitor Mode */
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-neutral-500 bg-neutral-100 px-2.5 py-1.5 rounded-lg">
                  <Users className="w-3 h-3 text-neutral-400" />
                  <span>کاربر مهمان (مشاهده عمومی)</span>
                </span>

                {/* Direct Login Button */}
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-400" />
                  <span>ورود با اکانت LDAP</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

