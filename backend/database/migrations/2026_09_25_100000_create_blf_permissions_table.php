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
        if (!Schema::hasTable('blf_permissions')) {
            Schema::create('blf_permissions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->unique()->index();
                $table->string('user_name')->nullable();
                $table->string('department')->nullable();
                $table->string('domain_id', 50)->nullable();
                $table->string('domain_name')->nullable();
                $table->boolean('can_view_blf')->default(false);
                $table->boolean('can_view_all')->default(false);
                $table->json('monitored_extensions')->nullable();
                $table->string('role', 30)->default('staff');
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('blf_permissions');
    }
};
