export type PrefixTitle = 'mr' | 'ms' | 'location'; // آقای / خانم / بدون عنوان (مکانی)

export interface LandlineEntry {
  id: string;
  phone: string; // خط تلفن ثابت
  extension: string; // داخلی
  title?: string; // برچسب اختیاری مثل خط ۱ یا بی‌سیم یا ریموت
  is_admin_only?: boolean; // خط محرمانه فقط قابل مشاهده برای مدیران (Admin Only)
}

export interface Contact {
  id: number | string;
  personnel_code?: string;
  prefix_title: PrefixTitle; // آقای / خانم (*)
  first_name: string; // نام (*)
  last_name: string; // نام خانوادگی (*)
  job_title?: string; // سمت
  department?: string; // واحد سازمانی / دپارتمان (متنی)
  location?: string; // موقعیت (طبقه، اتاق، ساختمان)
  mobiles: string[]; // شماره همراه (** امکان افزودن چند شماره)
  landlines: LandlineEntry[]; // شماره ثابت + داخلی (** امکان افزودن چند شماره)
  email?: string; // پست الکترونیک
  description?: string; // توضیحات
  avatar?: string; // عکس پرسنلی آپلود شده یا آواتار خودکار
  is_favorite?: boolean;
  // User Ownership & Visibility
  created_by_user_id: number; // شناسه کاربر ایجادکننده
  created_by_user_name?: string; // نام کاربری یا نام شخص ایجادکننده
  is_public?: boolean; // مخاطب عمومی سازمانی (قابل مشاهده برای همه)
  created_at?: string;

  // فیلدهای حریم خصوصی شماره همراه پرسنل
  is_mobile_public?: boolean; // آیا شماره همراه برای تمام پرسنل سازمان عمومی است؟ (پیش‌فرض: محرمانه)
  personal_mobiles?: Record<string | number, string[]>; // شماره‌های همراه در دفترچه شخصی کاربران: { [userId]: string[] }

  // ساختار سازمانی و دامین‌های داخلی در برابر شرکت‌های برون‌سازمانی
  contact_type?: 'internal' | 'external'; // افراد درون سازمان یا برون‌سازمانی (شرکت‌ها/پیمانکاران)
  domain_id?: string | number; // شناسه دامین مربوطه (برای داخلی‌های سازمان)
  domain_name?: string; // نام دامین سازمانی
  domain?: string; // فیلد دامین سازمانی سازگار با بک‌اند
  company_name?: string; // نام شرکت / پیمانکار (برای مخاطبان برون‌سازمانی)
  has_ldap_account?: boolean; // آیا حساب کاربری AD دارد یا صرفاً دارای تلفن و داخلی رومیزی است
  ldap_username?: string; // نام کاربری در اکتیودایرکتوری
  display_order?: number; // ترتیب نمایش سفارشی ادمین (اولویت چیدمان دستی)
}

export interface Department {
  id: string;
  name: string;
  code: string;
  domain_id?: string;
  domain_name?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  name: string;
  username?: string;
  email: string;
  personnel_code: string;
  role: 'admin' | 'staff' | 'viewer';
  department: string;
  avatar?: string;
  domain?: string; // دامین انتخابی کاربر در زمان لاگین LDAP
  domain_id?: string | number; // شناسه دامین انتخابی
  domain_name?: string; // عنوان نمایشی دامین
  auth_method?: 'ldap' | 'local'; // نحوه ورود
  extension?: string; // شماره داخلی تلفن رومیزی IP Phone خوانده‌شده از Active Directory (ipphone یا telephonenumber)
  can_view_blf?: boolean; // آیا دسترسی به نمایشگر وضعیت خطوط (BLF) دارد؟
  monitored_extensions?: string[]; // داخلی‌های منتخب برای مانیتورینگ BLF
}

export type BlfState = 'idle' | 'busy' | 'offline'; // سبز (آزاد)، قرمز (مشغول)، خاکستری (خارج از دسترس)

export interface BlfExtensionInfo {
  extension: string;
  name: string;
  contactId?: number | string;
  department?: string;
  jobTitle?: string;
  state: BlfState;
  domainId?: string;
  durationSec?: number; // مدت زمان مکالمه در ثانیه (برای وضعیت busy)
  lastChanged?: string;
}

export interface UserBlfPermission {
  userId: number;
  userName: string;
  role: 'admin' | 'staff' | 'viewer';
  department: string;
  domainId: string; // شناسه دامین کاربر
  domainName?: string; // نام دامین
  canViewBlf: boolean;
  monitoredExtensions: string[];
}

export interface LdapDomain {
  id: string;
  name: string; // نام دامین مثلا corp.local یا acme.ir
  display_name: string; // نام نمایشی فارسی دامین
  host: string; // آدرس سرور / کنترلر دامین
  port: number; // پورت (۳۸۹ برای پیش‌فرض، ۶۳۶ برای LDAPS)
  base_dn: string; // مسیر پایه مثل DC=corp,DC=company,DC=ir
  encryption: 'none' | 'ssl' | 'tls'; // نوع رمزنگاری
  bind_user?: string; // کاربر سرویس برای خواندن
  bind_password?: string;
  user_filter?: string; // فیلتر جستجوی کاربران در اکتیودایرکتوری
  is_default: boolean; // دامین پیش‌فرض ورود
  is_active: boolean; // فعال بودن دامین
  created_at?: string;

  // تنظیمات اختصاصی سرور ایزابل (VoIP / Asterisk AMI) برای قابلیت Click-to-Call
  voip_enabled?: boolean; // فعال‌سازی تماس با یک کلیک برای این دامین
  voip_server_host?: string; // آدرس IP یا هاست سرور ایزابل (مثلاً 192.168.10.20 یا voip.company.ir)
  voip_ami_port?: number; // پورت Asterisk Manager Interface (پیش‌فرض 5038)
  voip_ami_username?: string; // نام کاربری در manager.conf ایزابل
  voip_ami_secret?: string; // رمز عبور AMI
  voip_context?: string; // کانتکست خروجی ایزابل (پیش‌فرض from-internal)
  voip_trunk_prefix?: string; // پیش‌شماره خروجی خط شهری در صورت نیاز (مانند 9 یا خالی)
  voip_channel_tech?: 'SIP' | 'PJSIP' | 'DAHDI'; // تکنولوژی چنل تلفن‌های کاربر (پیش‌فرض SIP)
  voip_auto_answer?: boolean; // ارسال سیگنال پاسخگویی خودکار به تلفن رومیزی
}

export interface VoipCallSession {
  id: string;
  targetNumber: string;
  targetName: string;
  callerExtension: string;
  domainName: string;
  status: 'initiating' | 'ringing_desk' | 'connected' | 'failed' | 'ended';
  startedAt?: number;
  durationSec?: number;
  errorMessage?: string;
}

export interface LaravelConfig {
  baseUrl: string;
  apiPrefix: string;
  token: string;
  status: 'connected' | 'disconnected' | 'testing';
  lastPing?: string;
}

export type ViewMode = 'card' | 'table';

export interface FilterOptions {
  search: string;
  department: string;
  lineTitleSearch?: string; // جستجو در عناوین/برچسب‌های اختیاری خطوط
  favoritesOnly: boolean;
  creatorFilter?: 'all' | 'mine' | 'public' | number; // فیلتر برای ادمین و کاربران
}

export interface ApiUsageStatus {
  totalCalls: number;
  limit: number;
  remainingCalls: number;
  percentUsed: number;
  isApproachingLimit: boolean; // >= 75%
  isRateLimited: boolean; // >= 100%
  resetTimeRemainingSec: number;
  windowSizeSec: number;
}

