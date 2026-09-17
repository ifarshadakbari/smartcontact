<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contact;
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
        $contacts = $query->orderBy('id', 'desc')->get()->map(function ($contact) use ($userFavIds) {
            $contact->is_favorite = in_array($contact->id, $userFavIds);
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
            'is_public'        => 'nullable|boolean',
        ]);

        if ($user) {
            $validated['created_by_user_id'] = $user->id;
        }

        $contact = Contact::create($validated);
        $contact->is_favorite = false;

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
            'is_public'        => 'nullable|boolean',
        ]);

        $contact->update($validated);

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
     * تغییر وضعیت نشان‌شده / علاقه‌مندی به ازای کاربر لاگین‌شده (Toggle Favorite)
     * هم با شناسه عددی ($id) و هم با مدل بایندینگ (Contact $contact) سازگار است.
     */
    public function favorite(Request $request, $contact)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'کاربر احراز هویت نشده است.'], 401);
        }

        $contactModel = $contact instanceof Contact ? $contact : Contact::findOrFail($contact);

        // بررسی و تغییر وضعیت در جدول رابط contact_favorites
        $isFavorited = $user->favoriteContacts()->where('contact_id', $contactModel->id)->exists();
        if ($isFavorited) {
            $user->favoriteContacts()->detach($contactModel->id);
            $newStatus = false;
        } else {
            $user->favoriteContacts()->attach($contactModel->id);
            $newStatus = true;
        }

        return response()->json([
            'status'      => 'success',
            'contact_id'  => $contactModel->id,
            'is_favorite' => $newStatus,
            'message'     => $newStatus ? 'به نشان‌شده‌ها اضافه شد.' : 'از نشان‌شده‌ها حذف شد.',
        ]);
    }
}