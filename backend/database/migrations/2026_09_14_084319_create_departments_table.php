<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();                                         // نام رسمی واحد سازمانی
            $table->string('code')->nullable();                                       // کدینگ سازمانی (مثلا IT, FIN, MNG)
            $table->foreignId('domain_id')->nullable()->constrained('ldap_domains')->nullOnDelete(); // انتساب به دامین
            $table->integer('sort_order')->default(0);                                // اولویت نمایش در لیست‌ها
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};