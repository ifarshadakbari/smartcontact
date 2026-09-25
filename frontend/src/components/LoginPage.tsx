import React, { useState } from 'react';
import {
  Shield,
  Lock,
  User as UserIcon,
  ArrowLeft,
  Eye,
  EyeOff,
  Server,
  Network,
  CheckCircle2,
  AlertCircle,
  Globe,
  X,
} from 'lucide-react';
import { User, LaravelConfig, LdapDomain } from '../types';
import { PorsaLinkLogo } from './PorsaLinkLogo';

interface LoginPageProps {
  onLoginSuccess: (user: User, remember?: boolean) => void;
  laravelConfig: LaravelConfig;
  onOpenLaravelSettings: () => void;
  ldapDomains: LdapDomain[];
  onOpenLdapSettings?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  laravelConfig,
  onOpenLaravelSettings,
  ldapDomains,
  onOpenLdapSettings,
  isModal = false,
  onClose,
}) => {
  const activeDomains = ldapDomains.filter((d) => d.is_active);
  const defaultDomain = activeDomains.find((d) => d.is_default) || activeDomains[0];

  // Remembered credentials key
  const STORAGE_KEY_REMEMBERED_LOGIN = 'enterprise_phonebook_remembered_login';

  const [selectedDomainId, setSelectedDomainId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REMEMBERED_LOGIN);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.domainId) return parsed.domainId;
      }
    } catch (_) {}
    return defaultDomain?.id || '';
  });

  const [username, setUsername] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REMEMBERED_LOGIN);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.username) return parsed.username;
      }
    } catch (_) {}
    return '';
  });

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REMEMBERED_LOGIN);
      return !!saved;
    } catch (_) {
      return false;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep selected domain in sync if domains list changes asynchronously from server
  React.useEffect(() => {
    if (activeDomains.length > 0) {
      const exists = activeDomains.some((d) => d.id === selectedDomainId);
      if (!exists) {
        setSelectedDomainId(defaultDomain?.id || activeDomains[0].id);
      }
    }
  }, [activeDomains, selectedDomainId, defaultDomain?.id]);

  const currentDomain = activeDomains.find((d) => d.id === selectedDomainId) || defaultDomain;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('لطفاً نام کاربری یا شناسه اکانت دامین را وارد نمایید.');
      return;
    }
    if (!password) {
      setError('لطفاً رمز عبور را وارد نمایید.');
      return;
    }

    setIsLoading(true);
    const domainName = currentDomain ? (currentDomain.name || currentDomain.display_name) : 'دامین سازمانی';

    // Direct authentication with Database / LDAP API backend
    try {
      const targetUrl = `${laravelConfig.baseUrl.replace(/\/$/, '')}${laravelConfig.apiPrefix}/login/ldap`;
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          domain_id: selectedDomainId,
          domain_name: domainName,
          username: username.trim(),
          password: password,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        if (res.status === 404) {
          throw new Error(`مسیر احراز هویت (${targetUrl}) در سرور وب‌سرویس تعریف نشده است (خطای 404). لطفاً روت مربوطه را در سرور ثبت کنید.`);
        }
        throw new Error(`پاسخ سرور با کد ${res.status} در قالب HTML دریافت شد (خطای وب‌سرور یا عدم وجود روت وب‌سرویس).`);
      }

      const data = await res.json();
      setIsLoading(false);

      if (!res.ok) {
        setError(data.message || 'نام کاربری یا کلمه عبور دامین نادرست است.');
        return;
      }

      if (data.user) {
        if (rememberMe) {
          localStorage.setItem(
            STORAGE_KEY_REMEMBERED_LOGIN,
            JSON.stringify({
              username: username.trim(),
              domainId: selectedDomainId,
            })
          );
        } else {
          localStorage.removeItem(STORAGE_KEY_REMEMBERED_LOGIN);
        }

        if (data.token) {
          if (rememberMe) {
            localStorage.setItem('enterprise_phonebook_auth_token', data.token);
          } else {
            sessionStorage.setItem('enterprise_phonebook_auth_token', data.token);
            localStorage.removeItem('enterprise_phonebook_auth_token');
          }
        }

        const cleanUserStr = (data.user.username || username).trim().toLowerCase();
        const ADMIN_USERNAMES = ['administrator', 'sarrafi', 'admin', 'f.akbari'];
        const isLdapAdmin = ADMIN_USERNAMES.includes(cleanUserStr) || data.user.role === 'admin';

        const enrichedUser: User = {
          ...data.user,
          role: isLdapAdmin ? 'admin' : (data.user.role || 'staff'),
          domain_id: data.user.domain_id || selectedDomainId,
          domain: data.user.domain || currentDomain?.name || 'parszarasa.local',
          domain_name: data.user.domain_name || currentDomain?.display_name || currentDomain?.name,
        };

        onLoginSuccess(enrichedUser, rememberMe);
        if (onClose) onClose();
        return;
      } else {
        setError('پاسخ سرور شامل اطلاعات معتبر کاربر نبود.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(`خطا در اتصال به وب‌سرویس احراز هویت سرور: ${err?.message || 'لطفاً تنظیمات وب‌سرویس و دسترسی به سرور را بررسی نمایید.'}`);
      return;
    }
  };

  const content = (
    <div className="w-full max-w-md">
      {/* Login Card */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xl overflow-hidden">
        {/* Card Header with Accent Bar */}
        <div className="bg-neutral-900 p-6 text-white relative">
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 left-4 p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition cursor-pointer"
              title="بستن و بازگشت به دفترچه تلفن"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <PorsaLinkLogo className="w-11 h-11 shrink-0 drop-shadow-md" />
            <div>
              <h2 className="text-base font-bold tracking-tight">ورود به پُــرسا لینک</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                سیستم هوشمند اطلاعات و ارتباطات درون و برون سازمانی (LDAP / Active Directory)
              </p>
            </div>
          </div>

          {/* Connected Domain Badge */}
          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px]">
            <span className="text-neutral-400">دامین فعال جهت احراز هویت:</span>
            <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {currentDomain?.name || currentDomain?.display_name || 'دامین فعال'}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 leading-relaxed animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Domain Selection Dropdown */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                انتخاب دامین سازمانی (Active Directory Domain)
              </label>
              <div className="relative">
                <select
                  value={selectedDomainId}
                  onChange={(e) => setSelectedDomainId(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 text-neutral-800 font-medium transition cursor-pointer appearance-none"
                >
                  {activeDomains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.display_name} ({domain.name})
                    </option>
                  ))}
                </select>
                <Network className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                دسترسی به شماره‌های داخلی ۳ دامین و امکان برقراری تماس VoIP
              </p>
            </div>

            {/* Username / sAMAccountName */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                نام کاربری دامین
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g: amini"
                  className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 text-neutral-900 placeholder:text-neutral-400 transition"
                  required
                />
                <UserIcon className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-neutral-700">
                  رمز عبور ویندوز / دامین
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 text-neutral-900 placeholder:text-neutral-400 font-mono transition"
                  required
                />
                <Lock className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-2.5 text-neutral-400 hover:text-neutral-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-neutral-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <span>به خاطر سپردن مشخصات در این مرورگر</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs transition shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>بررسی اعتبار در Active Directory...</span>
                </>
              ) : (
                <>
                  <span>ورود با شناسه دامین</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {isModal && onClose && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-neutral-500 hover:text-neutral-800 underline transition cursor-pointer"
              >
                انصراف و ادامه مشاهده به عنوان کاربر مهمان (Guest)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="relative my-auto">{content}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col justify-between items-center p-4 sm:p-6 select-none font-sans">
      {/* Top Bar with Minimal Branding & LDAP/Laravel Mode */}
      <header className="w-full max-w-5xl flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm tracking-wider">
            DP
          </div>
          <div>
            <span className="font-bold text-neutral-900 text-sm block">سیستم اطلاعات تماس سازمانی</span>
            <span className="text-[11px] text-neutral-500 block">فهرست اطلاعات اشخاص درون و برون سازمانی</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenLdapSettings && (
            <button
              onClick={onOpenLdapSettings}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
              title="مشاهده یا تنظیم دامین‌های LDAP"
            >
              <Network className="w-3.5 h-3.5 text-blue-600" />
              <span>دامین‌های سازمانی</span>
            </button>
          )}

          <button
            onClick={onOpenLaravelSettings}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
            title="تنظیمات وب‌سرویس و پایگاه داده"
          >
            <Server className="w-3.5 h-3.5 text-neutral-500" />
            <span>تنظیمات وب‌سرویس سرور</span>
            <span
              className={`w-2 h-2 rounded-full ${
                laravelConfig.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </button>
        </div>
      </header>

      {/* Main Login Area */}
      <main className="w-full flex items-center justify-center py-6">{content}</main>

      {/* Footer */}
      <footer className="text-center text-xs text-neutral-400 py-2">
        <span>سیستم اطلاعات تماس سازمانی © {new Date().getFullYear()} - مبتنی بر LDAP / Active Directory و سرور تلفنی VoIP</span>
      </footer>
    </div>
  );
};
