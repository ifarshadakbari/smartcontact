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
     * دریافت لیست مخاطبین با وضعیت اختصاصی نشان‌شده کاربر لاگین‌شده
     */
    public function index(Request $request)
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
            if (!$user && $request->hasHeader('X-User-Id')) {
                $user = User::find($request->header('X-User-Id'));
            }
        }
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

        // تفکیک دسترسی: اگر کاربر ادمین نیست، فقط مخاطبین عمومی یا مخاطبین ثبت‌شده توسط خودش را ببیند
        if ($user && isset($user->role) && $user->role !== 'admin') {
            $query->where(function ($q) use ($user) {
                $q->where('is_public', true)
                  ->orWhere('created_by_user_id', $user->id);
            });
        }

        // استخراج شناسه‌های مخاطبان نشان‌شده کاربر جاری از جدول واسط contact_favorites
        $userFavIds = $user ? $user->favoriteContacts()->pluck('contacts.id')->toArray() : [];

        // افزودن وضعیت اختصاصی is_favorite به هر مخاطب برای این کاربر
        if (Schema::hasColumn('contacts', 'display_order')) {
            $query->orderBy('display_order', 'asc');
        }
        $contacts = $query->orderBy('id', 'desc')->get()->map(function ($contact) use ($user, $userFavIds) {
            if ($user) {
                $contact->is_favorite = in_array($contact->id, $userFavIds);
            } else {
                $contact->is_favorite = (bool) $contact->is_favorite;
            }
            $contact->domain_id = $contact->domain;
            $contact->domain_name = $contact->domain;
            return $contact;
        });

        return response()->json($contacts);
    }

    /**
     * ثبت مخاطب جدید
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'first_name'       => 'required|string|max:100',
            'last_name'        => 'required|string|max:100',
            'prefix_title'     => 'nullable|string|max:50',
            'personnel_code'   => 'nullable|string|max:50',
            'job_title'        => 'nullable|string|max:150',
            'department'       => 'nullable|string|max:150',
            'location'         => 'nullable|string|max:150',
            'mobiles'          => 'nullable|array',
            'landlines'        => 'nullable|array',
            'email'            => 'nullable|string|max:150',
            'description'      => 'nullable|string',
            'avatar'           => 'nullable|string',
            'contact_type'     => 'nullable|string|in:internal,external',
            'domain'           => 'nullable|string|max:100',
            'domain_id'        => 'nullable|string|max:100',
            'domain_name'      => 'nullable|string|max:100',
            'is_public'        => 'nullable|boolean',
            'is_favorite'      => 'nullable|boolean',
        ]);

        if (empty($validated['domain'])) {
            $validated['domain'] = $request->input('domain') ?? $request->input('domain_name') ?? $request->input('domain_id') ?? null;
        }
        unset($validated['domain_id'], $validated['domain_name']);

        if ($user) {
            $validated['created_by_user_id'] = $user->id;
        }

        $contact = Contact::create($validated);
        $contact->is_favorite = false;
        $contact->domain_id = $contact->domain;
        $contact->domain_name = $contact->domain;

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
        $contact->domain_id = $contact->domain;
        $contact->domain_name = $contact->domain;

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
        $user = $request->user();

        // کنترل دسترسی: کاربر عادی فقط مجاز به ویرایش مخاطبینی است که خودش ایجاد کرده است
        if ($user && isset($user->role) && $user->role !== 'admin') {
            if ((int)$contact->created_by_user_id !== (int)$user->id) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'شما فقط مجاز به ویرایش مخاطبینی هستید که خودتان ثبت کرده‌اید.',
                ], 403);
            }
        }

        $validated = $request->validate([
            'first_name'       => 'sometimes|required|string|max:100',
            'last_name'        => 'sometimes|required|string|max:100',
            'prefix_title'     => 'nullable|string|max:50',
            'personnel_code'   => 'nullable|string|max:50',
            'job_title'        => 'nullable|string|max:150',
            'department'       => 'nullable|string|max:150',
            'location'         => 'nullable|string|max:150',
            'mobiles'          => 'nullable|array',
            'landlines'        => 'nullable|array',
            'email'            => 'nullable|string|max:150',
            'description'      => 'nullable|string',
            'avatar'           => 'nullable|string',
            'contact_type'     => 'nullable|string|in:internal,external',
            'domain'           => 'nullable|string|max:100',
            'domain_id'        => 'nullable|string|max:100',
            'domain_name'      => 'nullable|string|max:100',
            'is_public'        => 'nullable|boolean',
            'is_favorite'      => 'nullable|boolean',
        ]);

        if ($request->has('domain') || $request->has('domain_id') || $request->has('domain_name')) {
            $validated['domain'] = $request->input('domain') ?? $request->input('domain_name') ?? $request->input('domain_id') ?? null;
        }
        unset($validated['domain_id'], $validated['domain_name']);

        $contact->update($validated);
        $contact->domain_id = $contact->domain;
        $contact->domain_name = $contact->domain;

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
        $user = $request->user();

        // کنترل دسترسی: کاربر عادی فقط مجاز به حذف مخاطبینی است که خودش ایجاد کرده است
        if ($user && isset($user->role) && $user->role !== 'admin') {
            if ((int)$contact->created_by_user_id !== (int)$user->id) {
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
}