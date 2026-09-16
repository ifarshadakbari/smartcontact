<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            
            // کد پرسنلی (اختیاری)
            $table->string('personnel_code')->nullable()->index();
            
            // پیشوند عنوان: mr (آقای) یا ms (خانم)
            $table->string('prefix_title', 10)->default('mr');
            
            // نام و نام خانوادگی
            $table->string('first_name');
            $table->string('last_name');
            
            // سمت شغلی و واحد سازمانی
            $table->string('job_title')->nullable();
            $table->string('department')->nullable()->index();
            
            // موقعیت مکانی (اتاق، طبقه، ساختمان)
            $table->string('location')->nullable();
            
            // شماره‌های همراه (ذخیره به صورت آرایه JSON شامل عنوان، شماره و وضعیت عمومی/خصوصی)
            $table->json('mobiles')->nullable();
            
            // شماره‌های ثابت و داخلی‌ها (ذخیره به صورت آرایه JSON شامل تلفن ثابت و شماره داخلی تلفن رومیزی)
            $table->json('landlines')->nullable();
            
            // ایمیل سازمانی
            $table->string('email')->nullable();
            
            // توضیحات و یادداشت‌ها
            $table->text('description')->nullable();
            
            // تصویر یا آواتار (Base64 یا مسیر فایل)
            $table->longText('avatar')->nullable();
            
            // نوع مخاطب: internal (درون سازمانی)، external (برون سازمانی)
            $table->string('contact_type', 20)->default('internal')->index();
            
            // دامین LDAP مخاطب (برای مثال CORP.COMPANY.IR)
            $table->string('domain', 100)->nullable()->index();
            
            // نشان علاقه‌مندی
            $table->boolean('is_favorite')->default(false);
            
            // شناسه کاربری که این مخاطب را ایجاد کرده
            $table->unsignedBigInteger('created_by_user_id')->nullable();
            
            // آیا برای همه پرسنل قابل مشاهده است؟
            $table->boolean('is_public')->default(true);
            
            // تاریخ ایجاد و آخرین ویرایش
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};