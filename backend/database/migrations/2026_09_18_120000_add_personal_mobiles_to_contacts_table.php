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
        Schema::table('contacts', function (Blueprint $table) {
            if (!Schema::hasColumn('contacts', 'is_mobile_public')) {
                $table->boolean('is_mobile_public')->default(false)->after('is_public');
            }
            if (!Schema::hasColumn('contacts', 'personal_mobiles')) {
                $table->json('personal_mobiles')->nullable()->after('mobiles');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            if (Schema::hasColumn('contacts', 'is_mobile_public')) {
                $table->dropColumn('is_mobile_public');
            }
            if (Schema::hasColumn('contacts', 'personal_mobiles')) {
                $table->dropColumn('personal_mobiles');
            }
        });
    }
};
