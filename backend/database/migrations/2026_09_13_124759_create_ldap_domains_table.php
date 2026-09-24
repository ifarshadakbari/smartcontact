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
Schema::create('ldap_domains', function (Blueprint $table) {
    $table->id();
    $table->string('name');              // PARSZARASA.LOCAL
    $table->string('display_name');      // دامین ستاد مرکزی
    $table->string('host');              // IP دامین کنترلر
    $table->integer('port')->default(389);
    $table->string('base_dn');           // DC=parszarasa,DC=local
    $table->string('encryption')->default('none');
    $table->string('bind_user')->nullable();
    $table->string('bind_password')->nullable();
    $table->string('user_filter')->nullable();
    $table->boolean('is_default')->default(false);
    $table->boolean('is_active')->default(true);
    $table->boolean('voip_enabled')->default(false);
    $table->string('voip_server_host')->nullable();
    $table->integer('voip_ami_port')->default(5038);
    $table->string('voip_ami_username')->nullable();
    $table->string('voip_ami_secret')->nullable();
    $table->string('voip_context')->default('from-internal');
    $table->string('voip_channel_tech')->default('SIP');
    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ldap_domains');
    }
};
