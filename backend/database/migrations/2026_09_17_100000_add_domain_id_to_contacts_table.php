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
        Schema::table('contacts', function (Blueprint $table) {
            if (!Schema::hasColumn('contacts', 'domain_id')) {
                $table->foreignId('domain_id')
                    ->nullable()
                    ->after('domain')
                    ->constrained('ldap_domains')
                    ->nullOnDelete();
            }
        });

        // Migrate existing domain strings into domain_id if matching ldap_domains exist
        if (Schema::hasTable('ldap_domains') && Schema::hasColumn('contacts', 'domain_id') && Schema::hasColumn('contacts', 'domain')) {
            $domains = DB::table('ldap_domains')->get();
            foreach ($domains as $d) {
                // Match by ID if stored as numeric string, or by name/display_name
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
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            if (Schema::hasColumn('contacts', 'domain_id')) {
                $table->dropForeign(['domain_id']);
                $table->dropColumn('domain_id');
            }
        });
    }
};
