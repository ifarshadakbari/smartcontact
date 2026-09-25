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
        if (Schema::hasTable('blf_permissions') && !Schema::hasColumn('blf_permissions', 'extra_data')) {
            Schema::table('blf_permissions', function (Blueprint $table) {
                $table->json('extra_data')->nullable()->after('monitored_extensions');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('blf_permissions') && Schema::hasColumn('blf_permissions', 'extra_data')) {
            Schema::table('blf_permissions', function (Blueprint $table) {
                $table->dropColumn('extra_data');
            });
        }
    }
};
