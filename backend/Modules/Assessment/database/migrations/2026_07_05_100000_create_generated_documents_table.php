<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Dokumen resmi hasil generate (transkrip yudisium dll): diproses di
     * queue, disimpan di storage, dan dapat diverifikasi publik via kode QR.
     * Tipe kolom kompatibel MySQL & PostgreSQL.
     */
    public function up(): void
    {
        Schema::create('generated_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 50)->default('transcript');
            $table->string('status', 20)->default('processing'); // processing, ready, failed
            $table->string('file_path')->nullable();
            $table->string('verification_code', 64)->unique();
            $table->json('meta')->nullable(); // name, nim, program, average, stase_count
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('generated_documents');
    }
};
