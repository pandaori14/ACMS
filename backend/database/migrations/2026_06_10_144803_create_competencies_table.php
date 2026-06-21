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
        Schema::create('competencies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->enum('type', ['disease', 'skill', 'other']);
            $table->string('category')->nullable(); // e.g. Sistem Saraf, Sistem Respirasi
            $table->string('level')->nullable(); // e.g. 1, 2, 3A, 3B, 4A
            $table->foreignUuid('stase_id')->nullable()->constrained('stases')->nullOnDelete();
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('competencies');
    }
};
