<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ContactController extends Controller
{
    /**
     * احراز و استخراج کاربر درخواست‌دهنده از توکن، سشن، هدر X-User-Id یا ورودی
     */
    protected function resolveUser(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            $token = $request->bearerToken();
            if ($token && class_exists('\Laravel\Sanctum\PersonalAccessToken')) {
                try {
                    $pat = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
                    if ($pat) {
                        $user = $pat->tokenable;
                    }
                } catch (\Throwable $e) {}
            }
        }
        if (!$user && $request->hasHeader('X-User-Id')) {
            $user = User::find($request->header('X-User-Id'));
        }
        if (!$user && $request->filled('created_by_user_id')) {
            $user = User::find($request->input('created_by_user_id'));
        }
        return $user;
    }

    /**
     * دریافت لیست مخاطبین با وضعیت اختصاصی نشان‌شده کاربر لاگین‌شده
     */
    public function index(Request $request)
    {
        $user = $this->resolveUser($request);
        $query = Contact::query();

        // فیلتر جستجو
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function($q) use ($s) {
                $q->where('first_name', 'like', "%{$s}%")
                  ->orWhere('last_name', 'like', "%{$s}%")
                  ->orWhere('job_title', 'like', "%{$s}%")
                  ->orWhere('department', 'like', "%{$s}%")
                  ->orWhere('personnel_code', 'like', "%{$s}%");
            });
        }

        // فیلتر دپارتمان / واحد سازمانی
        if ($request->filled('department') && $request->department !== 'all') {
            $query->where('department', $request->department);
        }

        // تفکیک دسترسی:
        // - مهمان (لاگین نکرده): منحصراً مخاطبین عمومی سازمانی
        // - پرسنل عادی: مخاطبین عمومی سازمانی + مخاطبین ثبت‌شده توسط خود کاربر
        // - ادمین: کلیه مخاطبین پایگاه داده
        if (!$user) {
            $query->where('is_public', true);
        } elseif (isset($user->role) && $user->role !== 'admin') {
            $query->where(function ($q) use ($user) {
                $q->where('is_public', true)
                  ->orWhere('created_by_user_id', $user->id);
            });
        }

        // استخراج شناسه‌های مخاطبان نشان‌شده کاربر جاری از جدول واسط contact_favorites
        $userFavIds = $user ? $user->favoriteContacts()->pluck('contacts.id')->toArray() : [];

        // افزودن وضعیت اختصاصی is_favorite به هر مخاطب برای این کاربر و پر کردن ساختار استاندارد دامین
        if (Schema::hasColumn('contacts', 'display_order')) {
            $query->orderBy('display_order', 'asc');
        }

        $ldapDomains = Schema::hasTable('ldap_domains') ? DB::table('ldap_domains')->get()->keyBy('id') : collect();
        $usersMap = Schema::hasTable('users') ? User::all()->keyBy('id') : collect();

        $contacts = $query->orderBy('id', 'desc')->get()->map(function ($contact) use ($user, $userFavIds, $ldapDomains, $usersMap) {
            if ($user) {
                $contact->is_favorite = in_array($contact->id, $userFavIds);
            } else {
                $contact->is_favorite = (bool) $contact->is_favorite;
            }

            // جایگزینی نام کاربری به جای ID در صورت وجود
            if (!empty($contact->created_by_user_id)) {
                $creator = $usersMap->get($contact->created_by_user_id);
                if ($creator) {
                    $contact->created_by_user_name = $creator->username ?: ($creator->name ?: $creator->email);
                }
            }

            // تعیین و همگام‌سازی domain_id و domain_name
            $domainObj = null;
            if (!empty($contact->domain_id) && isset($ldapDomains[$contact->domain_id])) {
                $domainObj = $ldapDomains[$contact->domain_id];
            } elseif (!empty($contact->domain)) {
                $domainObj = $ldapDomains->first(function ($d) use ($contact) {
                    return (string)$d->id === (string)$contact->domain || $d->name === $contact->domain || $d->display_name === $contact->domain;
                });
            }

            if ($domainObj) {
                $contact->domain_id = $domainObj->id;
                $contact->domain_name = $domainObj->display_name ?? $domainObj->name;
                $contact->domain = $domainObj->name;
            } else {
                $contact->domain_id = $contact->domain_id ?? (is_numeric($contact->domain) ? (int)$contact->domain : null);
                $contact->domain_name = $contact->domain ?? null;
            }

            return $contact;
        });

        return response()->json($contacts);
    }

    /**
     * ثبت مخاطب جدید
     */
    public function store(Request $request)
    {
        $user = $this->resolveUser($request);

        $validated = $request->validate([
            'first_name'          => 'required|string|max:100',
            'last_name'           => 'required|string|max:100',
            'prefix_title'        => 'nullable|string|max:50',
            'personnel_code'      => 'nullable|string|max:50',
            'job_title'           => 'nullable|string|max:150',
            'department'          => 'nullable|string|max:150',
            'location'            => 'nullable|string|max:150',
            'mobiles'             => 'nullable|array',
            'landlines'           => 'nullable|array',
            'email'               => 'nullable|string|max:150',
            'description'         => 'nullable|string',
            'avatar'              => 'nullable|string',
            'contact_type'        => 'nullable|string|in:internal,external',
            'domain'              => 'nullable|string|max:100',
            'domain_id'           => 'nullable|max:100',
            'domain_name'         => 'nullable|string|max:100',
            'is_public'           => 'nullable|boolean',
            'is_mobile_public'    => 'nullable|boolean',
            'personal_mobiles'    => 'nullable|array',
            'is_favorite'         => 'nullable|boolean',
            'created_by_user_id'  => 'nullable|integer',
            'created_by_user_name'=> 'nullable|string|max:150',
        ]);
        $rawDomainId = $request->input('domain_id');
        $rawDomain = $request->input('domain') ?? $request->input('domain_name');

        $resolvedDomainId = null;
        $resolvedDomainName = null;

        if (Schema::hasTable('ldap_domains')) {
            $domRecord = null;
            if (!empty($rawDomainId)) {
                $domRecord = DB::table('ldap_domains')->where('id', $rawDomainId)->first();
            }
            if (!$domRecord && !empty($rawDomain)) {
                $domRecord = DB::table('ldap_domains')
                    ->where('id', (string)$rawDomain)
                    ->orWhere('name', $rawDomain)
                    ->orWhere('display_name', $rawDomain)
                    ->first();
            }

            if ($domRecord) {
                $resolvedDomainId = $domRecord->id;
                $resolvedDomainName = $domRecord->name;
                if (Schema::hasColumn('contacts', 'domain_id')) {
                    $validated['domain_id'] = $domRecord->id;
                }
                if (Schema::hasColumn('contacts', 'domain')) {
                    $validated['domain'] = $domRecord->name;
                }
            } else {
                if (Schema::hasColumn('contacts', 'domain_id')) {
                    $validated['domain_id'] = is_numeric($rawDomainId) ? (int)$rawDomainId : null;
                }
                if (Schema::hasColumn('contacts', 'domain')) {
                    $validated['domain'] = $rawDomain ?? (is_numeric($rawDomainId) ? (string)$rawDomainId : null);
                }
            }
        } else {
            if (Schema::hasColumn('contacts', 'domain')) {
                $validated['domain'] = $rawDomain ?? (is_numeric($rawDomainId) ? (string)$rawDomainId : null);
            }
        }

        if (!Schema::hasColumn('contacts', 'domain')) {
            unset($validated['domain']);
        }
        unset($validated['domain_name']);

        // قانون: صرفاً کاربر ادمین، اجازه تعیین مخاطب عمومی سازمانی (is_public = true) را دارد.
        // برای سایر پرسنل لاگین‌کرده، افزودن مخاطب صرفاً حالت خصوصی دارد.
        $isAdmin = ($user && isset($user->role) && $user->role === 'admin') || $request->header('X-User-Role') === 'admin';
        if (!$isAdmin) {
            $validated['is_public'] = false;
            $validated['is_mobile_public'] = false;
        } else {
            $contactType = $validated['contact_type'] ?? 'internal';
            if ($contactType === 'external') {
                $validated['is_mobile_public'] = true;
            } else {
                $validated['is_mobile_public'] = !empty($validated['is_mobile_public']);
            }
        }

        // تعیین شناسه و نام کاربری ثبت‌کننده (created_by_user_id و created_by_user_name)
        $creatorId = null;
        $creatorName = null;
        if ($user) {
            $creatorId = $user->id;
            $creatorName = $user->username ?: ($user->name ?: $user->email);
        } elseif ($request->filled('created_by_user_id')) {
            $creatorId = (int)$request->input('created_by_user_id');
        } elseif ($request->hasHeader('X-User-Id')) {
            $creatorId = (int)$request->header('X-User-Id');
        }

        if (empty($creatorName) && $request->filled('created_by_user_name')) {
            $creatorName = $request->input('created_by_user_name');
        }

        if ($creatorId && empty($creatorName) && Schema::hasTable('users')) {
            $foundUser = User::find($creatorId);
            if ($foundUser) {
                $creatorName = $foundUser->username ?: ($foundUser->name ?: $foundUser->email);
            }
        }

        if (Schema::hasColumn('contacts', 'created_by_user_id') && $creatorId) {
            $validated['created_by_user_id'] = $creatorId;
        }

        if (Schema::hasColumn('contacts', 'created_by_user_name') && $creatorName) {
            $validated['created_by_user_name'] = $creatorName;
        } else {
            unset($validated['created_by_user_name']);
        }

        $contact = Contact::create($validated);
        $contact->is_favorite = false;
        $contact->domain_id = $contact->domain_id ?? $resolvedDomainId ?? (isset($contact->domain) && is_numeric($contact->domain) ? (int)$contact->domain : null);
        $contact->domain_name = $resolvedDomainName ?? $contact->domain_name ?? null;

        return response()->json([
            'status'  => 'success',
            'message' => 'مخاطب با موفقیت ذخیره شد.',
            'data'    => $contact,
        ], 201);
    }

    /**
     * ذخیره ترتیب و چیدمان سفارشی مخاطبین
     */
    public function reorder(Request $request)
    {
        $orders = $request->input('orders', []);
        if (is_array($orders)) {
            foreach ($orders as $item) {
                if (isset($item['id']) && isset($item['display_order'])) {
                    if (Schema::hasColumn('contacts', 'display_order')) {
                        DB::table('contacts')
                            ->where('id', $item['id'])
                            ->update(['display_order' => (int) $item['display_order']]);
                    }
                }
            }
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'ترتیب مخاطبین با موفقیت ذخیره شد.',
        ]);
    }

    /**
     * مشاهده تکی مخاطب
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $contact = Contact::findOrFail($id);

        if ($user) {
            $contact->is_favorite = $user->favoriteContacts()->where('contact_id', $contact->id)->exists();
        } else {
            $contact->is_favorite = false;
        }

        $domainObj = null;
        if (Schema::hasTable('ldap_domains')) {
            if (!empty($contact->domain_id)) {
                $domainObj = DB::table('ldap_domains')->where('id', $contact->domain_id)->first();
            }
            if (!$domainObj && !empty($contact->domain)) {
                $domainObj = DB::table('ldap_domains')
                    ->where('id', (string)$contact->domain)
                    ->orWhere('name', $contact->domain)
                    ->orWhere('display_name', $contact->domain)
                    ->first();
            }
        }

        if ($domainObj) {
            $contact->domain_id = $domainObj->id;
            $contact->domain_name = $domainObj->display_name ?? $domainObj->name;
            $contact->domain = $domainObj->name;
        } else {
            $contact->domain_id = $contact->domain_id ?? (isset($contact->domain) && is_numeric($contact->domain) ? (int)$contact->domain : null);
            $contact->domain_name = $contact->domain_name ?? null;
        }

        return response()->json([
            'status' => 'success',
            'data'   => $contact,
        ]);
    }

    /**
     * ویرایش مخاطب
     */
    public function update(Request $request, $id)
    {
        $contact = Contact::findOrFail($id);
        $user = $this->resolveUser($request);

        // کنترل دسترسی: کاربر عادی فقط مجاز به ویرایش مخاطبینی است که خودش ایجاد کرده است
        // مگر اینکه صرفاً در حال به‌روزرسانی شماره‌های همراه در دفترچه شخصی (personal_mobiles) خود باشد
        $isOnlyPersonalMobiles = $request->has('personal_mobiles') && count($request->except(['personal_mobiles', '_token', '_method'])) === 0;

        if ($user && isset($user->role) && $user->role !== 'admin' && !$isOnlyPersonalMobiles) {
            if (!empty($contact->created_by_user_id) && (int)$contact->created_by_user_id !== (int)$user->id) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'شما فقط مجاز به ویرایش مخاطبینی هستید که خودتان ثبت کرده‌اید.',
                ], 403);
            }
        }

        $validated = $request->validate([
            'first_name'          => 'sometimes|required|string|max:100',
            'last_name'           => 'sometimes|required|string|max:100',
            'prefix_title'        => 'nullable|string|max:50',
            'personnel_code'      => 'nullable|string|max:50',
            'job_title'           => 'nullable|string|max:150',
            'department'          => 'nullable|string|max:150',
            'location'            => 'nullable|string|max:150',
            'mobiles'             => 'nullable|array',
            'landlines'           => 'nullable|array',
            'email'               => 'nullable|string|max:150',
            'description'         => 'nullable|string',
            'avatar'              => 'nullable|string',
            'contact_type'        => 'nullable|string|in:internal,external',
            'domain'              => 'nullable|string|max:100',
            'domain_id'           => 'nullable|max:100',
            'domain_name'         => 'nullable|string|max:100',
            'is_public'           => 'nullable|boolean',
            'is_mobile_public'    => 'nullable|boolean',
            'personal_mobiles'    => 'nullable|array',
            'is_favorite'         => 'nullable|boolean',
            'created_by_user_id'  => 'nullable|integer',
            'created_by_user_name'=> 'nullable|string|max:150',
        ]);

        if ($request->has('domain') || $request->has('domain_id') || $request->has('domain_name')) {
            $rawDomainId = $request->input('domain_id');
            $rawDomain = $request->input('domain') ?? $request->input('domain_name');

            $resolvedDomainId = null;
            $resolvedDomainName = null;

            if (Schema::hasTable('ldap_domains')) {
                $domRecord = null;
                if (!empty($rawDomainId)) {
                    $domRecord = DB::table('ldap_domains')->where('id', $rawDomainId)->first();
                }
                if (!$domRecord && !empty($rawDomain)) {
                    $domRecord = DB::table('ldap_domains')
                        ->where('id', (string)$rawDomain)
                        ->orWhere('name', $rawDomain)
                        ->orWhere('display_name', $rawDomain)
                        ->first();
                }

                if ($domRecord) {
                    $resolvedDomainId = $domRecord->id;
                    $resolvedDomainName = $domRecord->name;
                    if (Schema::hasColumn('contacts', 'domain_id')) {
                        $validated['domain_id'] = $domRecord->id;
                    }
                    if (Schema::hasColumn('contacts', 'domain')) {
                        $validated['domain'] = $domRecord->name;
                    }
                } else {
                    if (Schema::hasColumn('contacts', 'domain_id')) {
                        $validated['domain_id'] = is_numeric($rawDomainId) ? (int)$rawDomainId : null;
                    }
                    if (Schema::hasColumn('contacts', 'domain')) {
                        $validated['domain'] = $rawDomain ?? (is_numeric($rawDomainId) ? (string)$rawDomainId : null);
                    }
                }
            } else {
                if (Schema::hasColumn('contacts', 'domain')) {
                    $validated['domain'] = $rawDomain ?? (is_numeric($rawDomainId) ? (string)$rawDomainId : null);
                }
            }
        }

        if (!Schema::hasColumn('contacts', 'domain')) {
            unset($validated['domain']);
        }
        unset($validated['domain_name']);

        // قانون: صرفاً کاربر ادمین، اجازه تعیین یا تغییر وضعیت به عمومی را دارد.
        $isAdmin = ($user && isset($user->role) && $user->role === 'admin') || $request->header('X-User-Role') === 'admin';
        if (!$isAdmin) {
            $validated['is_public'] = $contact->is_public;
            if (array_key_exists('is_mobile_public', $validated)) {
                $validated['is_mobile_public'] = $contact->is_mobile_public;
            }
        }

        // ادغام شماره‌های شخصی کاربر جاری با سایر کاربران در دیتابیس بدون تبدیل کلیدهای عددی شناسه کاربر
        if (isset($validated['personal_mobiles']) && is_array($validated['personal_mobiles'])) {
            $currentPersonal = is_array($contact->personal_mobiles) ? $contact->personal_mobiles : [];
            foreach ($validated['personal_mobiles'] as $uKey => $nums) {
                if (is_array($nums)) {
                    $currentPersonal[(string)$uKey] = array_values(array_unique(array_filter($nums)));
                }
            }
            $validated['personal_mobiles'] = $currentPersonal;
        }

        // ثبت یا به‌روزرسانی فیلد created_by_user_id در ویرایش مخاطب
        if (Schema::hasColumn('contacts', 'created_by_user_id')) {
            if ($request->filled('created_by_user_id')) {
                $validated['created_by_user_id'] = (int)$request->input('created_by_user_id');
            } elseif (empty($contact->created_by_user_id)) {
                if ($user) {
                    $validated['created_by_user_id'] = $user->id;
                } elseif ($request->hasHeader('X-User-Id')) {
                    $validated['created_by_user_id'] = (int)$request->header('X-User-Id');
                }
            }
        }

        // تنظیم یا حفظ نام کاربری ثبت‌کننده
        if ($request->filled('created_by_user_name')) {
            $validated['created_by_user_name'] = $request->input('created_by_user_name');
        } elseif (empty($contact->created_by_user_name) && !empty($contact->created_by_user_id) && Schema::hasTable('users')) {
            $foundUser = User::find($contact->created_by_user_id);
            if ($foundUser) {
                $validated['created_by_user_name'] = $foundUser->username ?: ($foundUser->name ?: $foundUser->email);
            }
        }

        if (!Schema::hasColumn('contacts', 'created_by_user_name')) {
            unset($validated['created_by_user_name']);
        }

        $contact->update($validated);

        // آماده‌سازی فیلدهای خروجی
        $contact->domain_id = $contact->domain_id ?? (isset($contact->domain) && is_numeric($contact->domain) ? (int)$contact->domain : null);
        $contact->domain_name = $resolvedDomainName ?? $contact->domain_name ?? null;

        return response()->json([
            'status'  => 'success',
            'message' => 'اطلاعات مخاطب به‌روزرسانی شد.',
            'data'    => $contact,
        ]);
    }

    /**
     * حذف مخاطب
     */
    public function destroy(Request $request, $id)
    {
        $contact = Contact::findOrFail($id);
        $user = $this->resolveUser($request);

        // کنترل دسترسی: کاربر عادی فقط مجاز به حذف مخاطبینی است که خودش ایجاد کرده است
        if ($user && isset($user->role) && $user->role !== 'admin') {
            if (!empty($contact->created_by_user_id) && (int)$contact->created_by_user_id !== (int)$user->id) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'شما فقط مجاز به حذف مخاطبینی هستید که خودتان ثبت کرده‌اید.',
                ], 403);
            }
        }

        $contact->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'مخاطب با موفقیت حذف شد.',
        ]);
    }

    /**
     * تغییر وضعیت نشان‌شده / علاقه‌مندی مخاطب در دیتابیس (Toggle Favorite)
     * هم با شناسه عددی ($id) و هم با مدل بایندینگ (Contact $contact) سازگار است.
     * اطلاعات را هم در جدول رابطه contact_favorites و هم در ستون is_favorite جدول contacts ذخیره می‌کند.
     */
    public function favorite(Request $request, $contact)
    {
        $contactModel = $contact instanceof Contact ? $contact : Contact::findOrFail($contact);

        // تلاش برای تشخیص کاربر از طریق Auth، Sanctum Token، هدر یا بادی درخواست
        $user = $request->user();
        if (!$user) {
            $token = $request->bearerToken();
            if ($token && class_exists('\Laravel\Sanctum\PersonalAccessToken')) {
                try {
                    $pat = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
                    if ($pat) {
                        $user = $pat->tokenable;
                    }
                } catch (\Throwable $e) {}
            }
            if (!$user && $request->hasHeader('X-User-Id')) {
                $user = User::find($request->header('X-User-Id'));
            }
            if (!$user && $request->filled('user_id')) {
                $user = User::find($request->input('user_id'));
            }
        }

        if ($user) {
            // وضعیت بر اساس جدول رابط کاربری contact_favorites
            $isFavorited = $user->favoriteContacts()->where('contact_id', $contactModel->id)->exists();
            if ($request->has('is_favorite')) {
                $newStatus = (bool) $request->input('is_favorite');
                if ($newStatus && !$isFavorited) {
                    $user->favoriteContacts()->attach($contactModel->id);
                } elseif (!$newStatus && $isFavorited) {
                    $user->favoriteContacts()->detach($contactModel->id);
                }
            } else {
                if ($isFavorited) {
                    $user->favoriteContacts()->detach($contactModel->id);
                    $newStatus = false;
                } else {
                    $user->favoriteContacts()->attach($contactModel->id);
                    $newStatus = true;
                }
            }
        } else {
            // اگر کاربری لاگین نبود، وضعیت مستقیماً بر اساس مقدار فعلی یا مقدار درخواستی معکوس می‌شود
            if ($request->has('is_favorite')) {
                $newStatus = (bool) $request->input('is_favorite');
            } else {
                $newStatus = !$contactModel->is_favorite;
            }
        }

        // ذخیره قطعی وضعیت جدید در ستون is_favorite جدول contacts در دیتابیس
        if (\Illuminate\Support\Facades\Schema::hasColumn('contacts', 'is_favorite')) {
            $contactModel->is_favorite = $newStatus;
            $contactModel->save();
        }

        return response()->json([
            'status'      => 'success',
            'contact_id'  => $contactModel->id,
            'is_favorite' => $newStatus,
            'message'     => $newStatus ? 'به نشان‌شده‌ها اضافه شد.' : 'از نشان‌شده‌ها حذف شد.',
        ]);
    }

    /**
     * ثبت و به‌روزرسانی اختصاصی شماره‌های همراه در دفترچه تلفن شخصی کاربر (Personal Overlay)
     */
    public function updatePersonalMobiles(Request $request, $id)
    {
        $contact = Contact::findOrFail($id);
        $user = $this->resolveUser($request);

        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'برای ثبت شماره در دفترچه تلفن شخصی، ورود به سیستم الزامی است.',
            ], 401);
        }

        $request->validate([
            'personal_mobiles' => 'required|array',
        ]);

        $incoming = $request->input('personal_mobiles');
        $current = is_array($contact->personal_mobiles) ? $contact->personal_mobiles : [];
        $userIdKey = (string)$user->id;

        if (is_array($incoming)) {
            if (isset($incoming[$userIdKey]) && is_array($incoming[$userIdKey])) {
                $current[$userIdKey] = array_values(array_unique(array_filter($incoming[$userIdKey])));
            } elseif (isset($incoming[0]) && is_string($incoming[0])) {
                $current[$userIdKey] = array_values(array_unique(array_filter($incoming)));
            } else {
                foreach ($incoming as $k => $v) {
                    if (is_array($v)) {
                        $current[(string)$k] = array_values(array_unique(array_filter($v)));
                    }
                }
            }
        }

        $contact->personal_mobiles = $current;
        $contact->save();

        return response()->json([
            'status'  => 'success',
            'data'    => $contact,
            'message' => 'شماره‌های همراه دفترچه شخصی با موفقیت در دیتابیس ثبت گردید.',
        ]);
    }
}