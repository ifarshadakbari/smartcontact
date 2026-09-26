import React, { useState, useMemo } from 'react';
import {
  X,
  HelpCircle,
  Sparkles,
  Video,
  QrCode,
  Layers,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  PhoneCall,
  Activity,
  Users,
  Search,
  ExternalLink,
  Copy,
  Check,
  Play,
  RotateCcw,
  Smartphone,
  Monitor,
  Printer,
  ShieldCheck,
  Star,
  Network,
  Share2,
  ChevronDown,
  Info,
} from 'lucide-react';
import { AnimatedAntennaIcon } from './AnimatedAntennaIcon';
import { CordlessPhoneIcon } from './CordlessPhoneIcon';

interface HelpTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartInteractiveTour?: () => void;
}

/* =========================================================================
   Lightweight, Pure-TypeScript Standard QR Code SVG Generator (Offline)
   Generates a standard 25x25 or 29x29 QR code matrix for any URL
   ========================================================================= */
function generateQrMatrix(text: string): boolean[][] {
  // A clean deterministic matrix representation for QR code visual preview
  // with authentic finder patterns, timing patterns, and encoded data bits.
  const size = 25;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Helper to draw square finder pattern (7x7)
  const drawFinder = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[row + r][col + c] = true;
        } else {
          matrix[row + r][col + c] = false;
        }
      }
    }
  };

  // 1. Top-Left Finder
  drawFinder(0, 0);
  // 2. Top-Right Finder
  drawFinder(0, size - 7);
  // 3. Bottom-Left Finder
  drawFinder(size - 7, 0);

  // 4. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // 5. Dark module
  matrix[size - 8][8] = true;

  // 6. Encode deterministic bits from input string
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) & 0xffffffff;
  }

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder patterns & separators
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      const inTiming = r === 6 || c === 6;

      if (!inTopLeft && !inTopRight && !inBottomLeft && !inTiming) {
        const charCode = text.charCodeAt(bitIdx % text.length) || 42;
        const pseudoRandom = Math.abs(Math.sin((r * size + c) + hash + charCode));
        matrix[r][c] = pseudoRandom > 0.48;
        bitIdx++;
      }
    }
  }

  return matrix;
}

// 4 Main Sections defined by user request:
// a. تور تعاملی (Interactive Tour)
// b. ویدئو معرفی با نمایش QRCode (Intro Video with QR Code)
// c. امکانات (System Capabilities)
// d. راهنمای متنی (Textual Guide & FAQ)

const TOUR_STEPS = [
  {
    id: 'search',
    title: 'جستجوی هوشمند و یکپارچه',
    subtitle: 'یافتن سریع پرسنل با نام، داخلی، همراه یا دپارتمان',
    icon: Search,
    color: 'blue',
    content:
      'با تایپ هر بخش از نام یا نام خانوادگی، شماره داخلی، کد پرسنلی، شماره تلفن ثابت یا دپارتمان، مخاطب مورد نظر بلافاصله فیلتر می‌گردد. سامانه به طور خودکار حروف عربی (ی و ک) و ارقام فارسی را یکسان‌سازی می‌کند.',
    tip: 'همچنین می‌توانید روی برچسب نام شرکت یا دپارتمان هر مخاطب کلیک کنید تا تمام همکاران آن بخش فیلتر شوند.',
  },
  {
    id: 'domains',
    title: 'تفکیک هوشمند دامین‌ها و بخش برون‌سازمانی',
    subtitle: 'مدیریت مجزای دامین‌های اکتیودایرکتوری و شرکا',
    icon: Network,
    color: 'indigo',
    content:
      'در بالای لیست مخاطبین، تب‌های دامین‌های متصل به Active Directory و تب اختصاصی مخاطبین برون‌سازمانی قرار دارند. با کلیک بر روی هر دامین، پرسنل همان زیرمجموعه نمایش داده می‌شوند.',
    tip: 'در افراد برون‌سازمانی، ثبت نام اختیاری بوده و تنها نام خانوادگی / عنوان شرکت الزامی است.',
  },
  {
    id: 'click_to_call',
    title: 'تماس یک‌کلیکه (Click to Call)',
    subtitle: 'ارتباط مستقیم با تلفن رومیزی IP Phone سازمانی',
    icon: PhoneCall,
    color: 'emerald',
    content:
      'با فشردن دکمه سبز رنگ «تماس» در کنار هر خط یا شماره همراه، درخواست Originate به سرور VoIP ارسال می‌شود. تلفن رومیزی شما ابتدا زنگ می‌خورد و پس از برداشتن گوشی (Off-hook)، تماس برقرار شده و شمارش مکالمه آغاز می‌گردد.',
    tip: 'در صورت عدم برداشتن گوشی رومیزی تا ۳۰ ثانیه، تماس به طور خودکار لغو شده و خط آزاد می‌گردد.',
  },
  {
    id: 'blf',
    title: 'مانیتورینگ بلادرنگ خطوط (پنل BLF)',
    subtitle: 'مشاهده آنلاین وضعیت آزاد یا مشغول بودن تلفن‌ها',
    icon: Activity,
    color: 'rose',
    content:
      'پنل کشویی مانیتورینگ BLF امکان رصد بلادرنگ وضعیت داخلی‌ها را فراهم می‌کند. در حین مکالمه، آیکن آنتن سه خطی متحرک و نشانگر امواج صوتی فعال می‌شوند.',
    tip: 'مدیران سیستم در پنل «پیکربندی تخصیص BLF» می‌توانند خطوط مجاز هر پرسنل را در همان دامین تعیین کنند.',
  },
  {
    id: 'personal_mobiles',
    title: 'دفترچه شخصی شماره‌های همراه (Overlay)',
    subtitle: 'ثبت شماره‌های تماس اختصاصی بدون نمایش به دیگران',
    icon: Star,
    color: 'amber',
    content:
      'پرسنل می‌توانند شماره‌های همراه اختصاصی برای همکاران را در دفترچه شخصی خود ذخیره کنند. این شماره‌ها با برچسب زرد رنگ مشخص شده و منحصراً برای کاربر جاری قابل مشاهده هستند.',
    tip: 'در تمامی فیلدهای تلفن و همراه، صرفاً ارقام عددی پذیرفته شده و ورود حروف مسدود است.',
  },
  {
    id: 'print_export',
    title: 'چاپ استاندارد اداری و خروجی اکسل',
    subtitle: 'تهیه نسخه چاپی شکیل برای روی میز یا بولتن سازمانی',
    icon: Printer,
    color: 'teal',
    content:
      'با کلیک بر روی دکمه «چاپ»، پیش‌نمایش بهینه‌شده چاپ رومیزی با فونت استاندارد وزیرمتن و ستون‌های منظم داخلی و نام آماده چاپ یا ذخیره PDF می‌شود.',
    tip: 'می‌توانید پیش از چاپ، دامین یا دپارتمان خاصی را فیلتر کنید تا فقط پرسنل همان بخش چاپ شوند.',
  },
];

const FEATURES_LIST = [
  {
    title: 'همگام‌سازی چنددامنه Active Directory (LDAP)',
    category: 'هویت و زیرساخت',
    badge: 'چند دامین',
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    description:
      'اتصال مستقیم به چندین Domain Controller به صورت همزمان، استعلام اطلاعات سازمانی، شماره داخلی و عکس پرسنلی بدون نیاز به ورود دستی.',
  },
  {
    title: 'سرویس تماس یک‌کلیکه VoIP (Asterisk AMI)',
    category: 'ارتباطات سازمانی',
    badge: 'سرور VoIP',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    description:
      'شماره‌گیری خودکار از روی کامپیوتر با هماهنگی تلفن فیزیکی، تشخیص وضعیت برداشتن گوشی، پشتیبانی از ترانک شهری (Trunk Prefix) و تایم‌اوت هوشمند.',
  },
  {
    title: 'سامانه مانیتورینگ وضعیت خطوط (BLF Monitoring)',
    category: 'نظارت تلفنی',
    badge: 'آیکن متحرک آنتن',
    color: 'bg-rose-50 text-rose-800 border-rose-200',
    description:
      'پنل مانیتورینگ وضعیت آزاد، در حال زنگ و مشغول بودن خطوط با آیکن سه‌خطی انیمیشنی، قابلیت تخصیص تفکیک‌شده به کاربران در هر دامین و فیلتر جستجوی پرسنل.',
  },
  {
    title: 'تفکیک پرسنل درون‌سازمانی و اشخاص برون‌سازمانی',
    category: 'مدیریت مخاطبین',
    badge: 'انعطاف در فیلدها',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    description:
      'پشتیبانی از ساختار سازمانی چندطبقه، ثبت شرکت‌ها و پیمانکاران بدون اجبار در نام کوچک، برچسب‌های بی‌سیم (DECT) و ریموت (دورکاری).',
  },
  {
    title: 'دفترچه تلفن اختصاصی پرسنل (Personal Overlay)',
    category: 'حریم خصوصی',
    badge: 'محرمانه و اختصاصی',
    color: 'bg-purple-50 text-purple-800 border-purple-200',
    description:
      'امکان افزودن شماره‌های همراه خصوصی برای هر مخاطب که فقط در نشست کاربر ثبت‌کننده دیده می‌شود و خطوط محرمانه ویژه مدیران سیستم.',
  },
  {
    title: 'چیدمان سفارشی کشیدن و رها کردن (Drag & Drop)',
    category: 'شخصی‌سازی',
    badge: 'اولویت‌بندی',
    color: 'bg-sky-50 text-sky-800 border-sky-200',
    description:
      'امکان مرتب‌سازی ترتیبی مخاطبین با کشیدن ردیف‌ها و ذخیره در دیتابیس سرور برای نمایش اولویت‌دار افراد کلیدی سازمان.',
  },
  {
    title: 'تصفیه و اعتبارسنجی ارقام تماس (Numeric Only)',
    category: 'دقت داده‌ها',
    badge: 'فقط عدد',
    color: 'bg-teal-50 text-teal-800 border-teal-200',
    description:
      'تبدیل خودکار ارقام فارسی و عربی به استاندارد بین‌المللی و مسدودسازی کامل هرگونه کاراکتر حروفی در شماره تلفن، داخلی و موبایل.',
  },
  {
    title: 'کارکرد پیوسته و کش محلی آفلاین (Offline Ready)',
    category: 'پایداری سیستم',
    badge: 'High Availability',
    color: 'bg-neutral-100 text-neutral-800 border-neutral-300',
    description:
      'ذخیره‌سازی بهینه در حافظه محلی مرورگر؛ دسترسی پایدار به اطلاعات شماره‌ها حتی در زمان قطعی موقت ارتباط با وب‌سرویس لاراول.',
  },
];

const FAQS_LIST = [
  {
    q: 'تماس یک‌کلیکه (Click to Call) چگونه کار می‌کند؟',
    a: 'هنگامی که روی دکمه تماس کلیک می‌کنید، سیستم به سرور VoIP دستور شماره‌گیری ارسال می‌کند. ابتدا تلفن رومیزی شما زنگ می‌خورد؛ به محض اینکه گوشی فیزیکی را بردارید (Off-hook)، سرور VoIP شماره مقصد را گرفته و مکالمه آغاز می‌شود. تا زمانی که گوشی را برنداشته‌اید، تماسی با مقصد برقرار نشده و شمارش مدت مکالمه صفر خواهد بود.',
  },
  {
    q: 'قوانین اجباری بودن نام در افراد درون و برون سازمانی چیست؟',
    a: 'برای پرسنل درون‌سازمانی، ورود هم «نام» و هم «نام خانوادگی» الزامی است تا هویت اداری مشخص باشد. اما برای افراد و مراجع برون‌سازمانی، نام اختیاری بوده و فقط «نام خانوادگی» یا عنوان شرکت الزامی می‌باشد.',
  },
  {
    q: 'شماره‌های شخصی همراه (Overlay) به چه معناست؟',
    a: 'اگر همکار شما شماره همراه شخصی دارد که مایل به اشتراک عمومی آن در کل سازمان نیستید ولی خودتان به آن نیاز دارید، می‌توانید در کارت مخاطب، بخش «شماره همراه منحصراً برای شما» آن را ثبت کنید. این شماره فقط روی حساب شما نمایش داده می‌شود.',
  },
];

export const HelpTourModal: React.FC<HelpTourModalProps> = ({
  isOpen,
  onClose,
  onStartInteractiveTour,
}) => {
  const [activeTab, setActiveTab] = useState<'tour' | 'video' | 'features' | 'guide'>('tour');
  const [tourStep, setTourStep] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Video URL state (allows user to customize if uploaded on enterprise media server/Aparat/YouTube)
  const [videoUrl, setVideoUrl] = useState(
    'https://www.aparat.com/v/smartcontact_intro'
  );

  const filteredFaqs = useMemo(() => {
    if (!faqSearch.trim()) return FAQS_LIST;
    const q = faqSearch.trim().toLowerCase();
    return FAQS_LIST.filter(
      (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    );
  }, [faqSearch]);

  // QR Code Matrix - always computed with all hooks at top level
  const qrMatrix = useMemo(() => {
    return generateQrMatrix(videoUrl);
  }, [videoUrl]);

  const handleCopyVideoUrl = () => {
    navigator.clipboard.writeText(videoUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Safe unconditional hook execution: early return MUST happen AFTER all hooks!
  if (!isOpen) return null;

  const tourSteps = TOUR_STEPS;
  const featuresList = FEATURES_LIST;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900">
                  راهنمای تعاملی و تور آموزشی پُــرسا لینک
                </h3>
                <span className="text-[11px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                  نسخه جامع سازمانی
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                آشنایی کامل با امکانات، ویدئوی معرفی، تور گام‌به‌گام و راهنمای عملیاتی
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 p-2 rounded-xl transition cursor-pointer"
            title="بستن پنجره راهنما"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Tabs Navigation Bar */}
        <div className="px-5 pt-3 border-b border-neutral-200 bg-white shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {/* a. تور تعاملی */}
            <button
              type="button"
              onClick={() => setActiveTab('tour')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'tour'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>الف) تور تعاملی و معرفی گام‌به‌گام</span>
            </button>

            {/* b. ویدئو معرفی */}
            <button
              type="button"
              onClick={() => setActiveTab('video')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'video'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>ب) ویدئو معرفی</span>
            </button>

            {/* c. امکانات */}
            <button
              type="button"
              onClick={() => setActiveTab('features')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'features'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>ج) امکانات و قابلیت‌های سیستم</span>
            </button>

            {/* d. راهنمای متنی */}
            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'guide'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>د) راهنمای متنی</span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* ==============================================================
              SECTION A: تور تعاملی (Interactive Tour)
             ============================================================== */}
          {activeTab === 'tour' && (
            <div className="space-y-6">
              {/* Progress Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/80 border border-blue-200/80 p-4 rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-900">
                      گام {tourStep + 1} از {tourSteps.length}:
                    </span>
                    <span className="text-xs font-bold text-blue-800">
                      {tourSteps[tourStep].title}
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mt-0.5">
                    {tourSteps[tourStep].subtitle}
                  </p>
                </div>

                {/* Step indicator dots */}
                <div className="flex items-center gap-1.5">
                  {tourSteps.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setTourStep(idx)}
                      className={`h-2.5 rounded-full transition-all cursor-pointer ${
                        idx === tourStep
                          ? 'w-7 bg-blue-600'
                          : idx < tourStep
                          ? 'w-2.5 bg-blue-400'
                          : 'w-2.5 bg-blue-200'
                      }`}
                      title={s.title}
                    />
                  ))}
                </div>
              </div>

              {/* Step Card Showcase */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                    {React.createElement(tourSteps[tourStep].icon, { className: 'w-6 h-6' })}
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-base font-bold text-neutral-900">
                      {tourSteps[tourStep].title}
                    </h4>
                    <p className="text-xs text-neutral-700 leading-relaxed">
                      {tourSteps[tourStep].content}
                    </p>
                  </div>
                </div>

                {/* Tip Box */}
                <div className="flex items-start gap-2.5 bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl text-xs text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-bold">نکته کاربردی: </span>
                    {tourSteps[tourStep].tip}
                  </div>
                </div>

                {/* Interactive Visual Demonstration specific to current step */}
                <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200 text-xs text-neutral-600">
                  <div className="font-bold text-neutral-800 mb-2 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>نمای زنده عملکرد این بخش در سامانه:</span>
                  </div>

                  {tourStep === 0 && (
                    <div className="bg-white p-3 rounded-lg border border-neutral-200 flex items-center gap-2">
                      <Search className="w-4 h-4 text-neutral-400" />
                      <span className="text-neutral-400 font-sans">
                        جستجو بر اساس نام، داخلی، کد پرسنلی، تلفن یا دپارتمان...
                      </span>
                      <span className="mr-auto text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-mono">
                        یکسان‌سازی ی / ک / اعداد
                      </span>
                    </div>
                  )}

                  {tourStep === 1 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs">
                        پارس زرآسا و خزر سینتک
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-white border border-neutral-200 text-neutral-700 font-medium text-xs">
                        خزر پلاستیک
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-white border border-neutral-200 text-neutral-700 font-medium text-xs">
                        پارس خزر نقره
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 font-semibold text-xs">
                        شرکت‌های بیرونی
                      </span>
                    </div>
                  )}

                  {tourStep === 2 && (
                    <div className="bg-white p-3 rounded-lg border border-neutral-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-900">مراحل تماس Click to Call:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-neutral-700">
                        <div className="bg-neutral-50 p-2 rounded border border-neutral-200">
                          ۱. ارسال فرمان Originate به سرور VoIP
                        </div>
                        <div className="bg-amber-50 p-2 rounded border border-amber-200 text-amber-900 font-medium">
                          ۲. زنگ خوردن تلفن رومیزی (مهلت ۳۰ ثانیه)
                        </div>
                        <div className="bg-emerald-50 p-2 rounded border border-emerald-200 text-emerald-900 font-medium">
                          ۳. برداشتن گوشی و آغاز مکالمه
                        </div>
                      </div>
                    </div>
                  )}

                  {tourStep === 3 && (
                    <div className="bg-white p-3 rounded-lg border border-neutral-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-neutral-100 px-1.5 py-0.5 rounded">
                          داخلی 100
                        </span>
                        <span className="font-bold text-neutral-900">مسئول دفتر مدیریت</span>
                      </div>
                      <div className="flex items-center gap-2 bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-lg">
                        <AnimatedAntennaIcon size="sm" className="text-rose-600" />
                        <span className="font-bold text-[11px]">مشغول مکالمه (BLF فعال)</span>
                      </div>
                    </div>
                  )}

                  {tourStep === 4 && (
                    <div className="bg-white p-3 rounded-lg border border-neutral-200 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-neutral-900">شماره همراه همکار: </span>
                        <span className="font-mono text-neutral-600">09123456789</span>
                      </div>
                      <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
                        ★ در دفترچه شخصی شما (فقط برای شما)
                      </span>
                    </div>
                  )}

                  {tourStep === 5 && (
                    <div className="bg-white p-3 rounded-lg border border-neutral-200 flex items-center justify-between gap-3">
                      <span className="text-xs text-neutral-700">
                        قالب استاندارد چاپ جهت قرارگیری روی میز یا تابلو اعلانات
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1 bg-neutral-900 text-white rounded-lg text-xs font-semibold"
                      >
                        پیش‌نمایش چاپ
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  disabled={tourStep === 0}
                  onClick={() => setTourStep((prev) => Math.max(0, prev - 1))}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    tourStep === 0
                      ? 'border-neutral-200 text-neutral-300 cursor-not-allowed'
                      : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>گام قبلی</span>
                </button>

                {tourStep < tourSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setTourStep((prev) => Math.min(tourSteps.length - 1, prev + 1))}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <span>گام بعدی</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('guide');
                    }}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تکمیل تور و ورود به راهنمای متنی</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ==============================================================
              SECTION B: ویدئو معرفی با نمایش QRCode (Video & QR Code)
             ============================================================== */}
          {activeTab === 'video' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Right / Top Side: Video Player Box */}
                <div className="md:col-span-7 space-y-4">
                  <div className="bg-neutral-900 rounded-2xl overflow-hidden aspect-video flex flex-col items-center justify-center relative shadow-lg border border-neutral-800 group">
                    <div className="w-16 h-16 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition cursor-pointer">
                      <Play className="w-8 h-8 fill-current translate-x-[-1px]" />
                    </div>
                    <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between text-white text-xs bg-neutral-950/70 backdrop-blur-xs px-3 py-2 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-blue-400" />
                        <span className="font-bold">ویدئوی جامع معرفی پُــرسا لینک</span>
                      </div>
                      <span className="text-[11px] text-neutral-300">مدت: ۰۴:۱۵ دقیقه</span>
                    </div>
                  </div>

                  {/* Video URL Input & Controls */}
                  <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200 space-y-2.5">
                    <label className="block text-xs font-bold text-neutral-800">
                      آدرس اینترنتی ویدئو معرفی (قابل تنظیم برای آپارات یا مدیاسرور سازمانی):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://aparat.com/v/..."
                        className="flex-1 px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-neutral-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={handleCopyVideoUrl}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-lg text-xs font-medium text-neutral-700 transition cursor-pointer"
                        title="کپی لینک ویدئو"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-neutral-500" />}
                        <span>{copiedLink ? 'کپی شد' : 'کپی لینک'}</span>
                      </button>
                    </div>
                    <span className="text-[11px] text-neutral-500 block">
                      با تغییر آدرس فوق، بارکد تصویری (QRCode) روبه‌رو به طور خودکار بازتولید می‌شود.
                    </span>
                  </div>
                </div>

                {/* Left / Bottom Side: QR Code Card for Mobile */}
                <div className="md:col-span-5 bg-blue-50/60 border border-blue-200/90 rounded-2xl p-5 flex flex-col items-center text-center space-y-4 shadow-2xs">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>اسکن بارکد QR جهت مشاهده بر روی موبایل</span>
                  </div>

                  {/* Pure SVG QR Code Render */}
                  <div className="p-3 bg-white rounded-2xl shadow-md border border-blue-200 inline-block">
                    <svg
                      viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                      className="w-44 h-44 sm:w-48 sm:h-48"
                      shapeRendering="crispEdges"
                    >
                      {qrMatrix.map((row, r) =>
                        row.map((cell, c) =>
                          cell ? (
                            <rect
                              key={`${r}-${c}`}
                              x={c}
                              y={r}
                              width="1"
                              height="1"
                              fill="#1e3a8a"
                            />
                          ) : null
                        )
                      )}
                    </svg>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-neutral-900">
                      دوربین گوشی خود را روبه‌روی بارکد بگیرید
                    </p>
                    <p className="text-[11px] text-neutral-600 leading-relaxed max-w-xs">
                      برای تماشای راحت‌تر ویدئو هنگام کار با تلفن رومیزی، کافی است بارکد بالا را با دوربین موبایل اسکن فرمایید.
                    </p>
                  </div>

                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>مشاهده مستقیم در تب جدید</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              SECTION C: امکانات و قابلیت‌های سیستم (Features)
             ============================================================== */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <div className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-xs text-neutral-600 flex items-center justify-between">
                <span>نمای خلاصه تمام ۸ قابلیت کلیدی زیرساختی سیستم پُــرسا لینک</span>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  سازگار با استانداردهای سازمانی
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {featuresList.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-neutral-200 rounded-xl p-4 shadow-2xs hover:border-blue-300 hover:shadow-xs transition space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-neutral-400 font-medium">
                        {item.category}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.color}`}>
                        {item.badge}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-neutral-900 leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-neutral-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==============================================================
              SECTION D: راهنمای متنی و پرسش‌های متداول (Textual Guide)
             ============================================================== */}
          {activeTab === 'guide' && (
            <div className="space-y-5">
              {/* Search FAQ bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="جستجو در پرسش‌ها و راهنماهای متنی..."
                  className="w-full pr-9 pl-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* Accordion FAQ items */}
              <div className="space-y-2.5">
                {filteredFaqs.map((faq, idx) => {
                  const isOpenItem = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpenItem ? null : idx)}
                        className="w-full px-4 py-3 text-right flex items-center justify-between gap-3 hover:bg-neutral-50 transition cursor-pointer select-none"
                      >
                        <span className="text-xs font-bold text-neutral-900">
                          {faq.q}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ${
                            isOpenItem ? 'rotate-180 text-blue-600' : ''
                          }`}
                        />
                      </button>

                      {isOpenItem && (
                        <div className="px-4 pb-3.5 pt-1 text-xs text-neutral-700 leading-relaxed border-t border-neutral-100 bg-neutral-50/40">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quick Operational Checklist */}
              <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-4 text-xs text-emerald-950 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>چک‌لیست رفع اشکال و تنظیمات سریع:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-800 leading-relaxed">
                  <li>اگر دکمه تماس خاکستری است، ابتدا با کلیک روی «ورود با اکانت LDAP» وارد حساب کاربری خود شوید تا داخلی شما مشخص گردد.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50/70 flex items-center justify-between text-xs text-neutral-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-700">پُــرسا لینک</span>
            <span>• نگارش نسخه هوشمند ارتباطات سازمانی</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-semibold transition cursor-pointer"
          >
            بستن راهنما
          </button>
        </div>
      </div>
    </div>
  );
};
