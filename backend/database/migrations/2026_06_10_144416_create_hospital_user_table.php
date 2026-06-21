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
        Schema::create('hospital_user', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('hospital_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
        });

        // Hapus foreign key 'hospital_id' di tabel users jika ada
        if (Schema::hasColumn('users', 'hospital_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('hospital_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hospital_user');

        if (! Schema::hasColumn('users', 'hospital_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignUuid('hospital_id')->nullable()->constrained()->nullOnDelete();
            });
        }
    }
};
