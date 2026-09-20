<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DepartmentController extends Controller
{
    /**
     * دریافت لیست کلیه واحدهای سازمانی (مرتب‌شده بر اساس اولویت و نام)
     */
    public function index(Request $request)
    {
        $query = Department::query()->with('domain');

        if ($request->filled('domain_id')) {
            $query->where(function ($q) use ($request) {
                $q->where('domain_id', $request->domain_id)
                  ->orWhereNull('domain_id');
            });
        }

        $departments = $query->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json($departments);
    }

    /**
     * ثبت واحد سازمانی جدید
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:150|unique:departments,name',
            'code'       => 'nullable|string|max:50',
            'domain_id'  => 'nullable|exists:ldap_domains,id',
            'sort_order' => 'nullable|integer',
        ]);

        $department = Department::create($validated);
        return response()->json($department, 201);
    }

    /**
     * نمایش اطلاعات یک واحد
     */
    public function show(Department $department)
    {
        return response()->json($department);
    }

    /**
     * ویرایش واحد سازمانی
     */
    public function update(Request $request, Department $department)
    {
        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:150', Rule::unique('departments')->ignore($department->id)],
            'code'       => 'nullable|string|max:50',
            'domain_id'  => 'nullable|exists:ldap_domains,id',
            'sort_order' => 'nullable|integer',
        ]);

        $department->update($validated);
        return response()->json($department);
    }

    /**
     * حذف واحد سازمانی
     */
    public function destroy(Department $department)
    {
        $department->delete();
        return response()->json(['message' => 'واحد سازمانی با موفقیت حذف شد.']);
    }

    /**
     * همگام‌سازی دسته‌جمعی لیست واحدها
     */
    public function sync(Request $request)
    {
        $request->validate([
            'departments' => 'required|array',
            'departments.*.name' => 'required|string|max:150',
        ]);

        $items = $request->input('departments', []);
        $saved = [];
        $savedIds = [];

        foreach ($items as $index => $item) {
            $dept = null;
            if (!empty($item['id']) && is_numeric($item['id'])) {
                $dept = Department::find($item['id']);
            }
            if (!$dept) {
                $dept = Department::where('name', $item['name'])->first();
            }

            $domainId = !empty($item['domain_id']) && is_numeric($item['domain_id']) ? (int)$item['domain_id'] : null;

            if ($dept) {
                $dept->update([
                    'name'       => $item['name'],
                    'code'       => $item['code'] ?? null,
                    'domain_id'  => $domainId,
                    'sort_order' => $index,
                ]);
            } else {
                $dept = Department::create([
                    'name'       => $item['name'],
                    'code'       => $item['code'] ?? null,
                    'domain_id'  => $domainId,
                    'sort_order' => $index,
                ]);
            }
            $dept->load('domain');
            $savedIds[] = $dept->id;
            $saved[] = $dept;
        }

        // حذف واحدهایی که توسط ادمین در فرم حذف شده‌اند
        if (!empty($savedIds)) {
            Department::whereNotIn('id', $savedIds)->delete();
        }

        return response()->json([
            'message' => 'واحدهای سازمانی با موفقیت با دیتابیس همگام شدند.',
            'data'    => $saved
        ]);
    }
}