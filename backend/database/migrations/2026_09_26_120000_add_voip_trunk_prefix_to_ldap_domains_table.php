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
        Schema::table('ldap_domains', function (Blueprint $table) {
            if (!Schema::hasColumn('ldap_domains', 'voip_trunk_prefix')) {
                $table->string('voip_trunk_prefix', 20)->nullable()->after('voip_channel_tech');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ldap_domains', function (Blueprint $table) {
            if (Schema::hasColumn('ldap_domains', 'voip_trunk_prefix')) {
                $table->dropColumn('voip_trunk_prefix');
            }
        });
    }
};
