<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Ensure all contacts with a domain string have their domain_id populated first
        if (Schema::hasTable('ldap_domains') && Schema::hasColumn('contacts', 'domain') && Schema::hasColumn('contacts', 'domain_id')) {
            $domains = DB::table('ldap_domains')->get();
            foreach ($domains as $d) {
                DB::table('contacts')
                    ->whereNull('domain_id')
                    ->where(function ($query) use ($d) {
                        $query->where('domain', (string) $d->id)
                              ->orWhere('domain', $d->name)
                              ->orWhere('domain', $d->display_name);
                    })
                    ->update(['domain_id' => $d->id]);
            }
        }

        // 2. Drop the redundant domain column from contacts table
        Schema::table('contacts', function (Blueprint $table) {
            if (Schema::hasColumn('contacts', 'domain')) {
                $table->dropColumn('domain');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            if (!Schema::hasColumn('contacts', 'domain')) {
                $table->string('domain', 100)->nullable()->after('contact_type');
            }
        });

        // Re-populate domain name from ldap_domains
        if (Schema::hasTable('ldap_domains') && Schema::hasColumn('contacts', 'domain') && Schema::hasColumn('contacts', 'domain_id')) {
            $domains = DB::table('ldap_domains')->get();
            foreach ($domains as $d) {
                DB::table('contacts')
                    ->where('domain_id', $d->id)
                    ->update(['domain' => $d->name]);
            }
        }
    }
};
