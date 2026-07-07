<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Bank soal REUSABLE lintas ujian (soal per-ujian tetap di exam_questions;
        // memilih dari bank = MENYALIN ke ujian agar riwayat ujian immutable)
        Schema::create('question_bank_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('stase_id')->nullable()->constrained('stases')->nullOnDelete();
            $table->string('topic', 100)->nullable();
            // Nilai dari system_references kategori question_difficulties
            $table->string('difficulty', 30)->nullable();
            $table->text('question_text');
            // [{option_text: string, is_correct: bool}, ...] — tepat satu benar
            $table->json('options');
            $table->integer('points')->default(1);
            $table->foreignUuid('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['stase_id', 'difficulty']);
        });

        // Tracking hasil UKMPPD (exit exam nasional) per percobaan
        Schema::create('ukmppd_results', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // users.id — selaras domain ujian (exam_participants)
            $table->foreignUuid('student_id')->constrained('users')->onDelete('cascade');
            $table->unsignedTinyInteger('attempt_number');
            $table->date('exam_date');
            $table->decimal('cbt_score', 5, 2)->nullable();
            $table->decimal('osce_score', 5, 2)->nullable();
            // Nilai dari system_references kategori ukmppd_statuses
            $table->string('status', 30);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'attempt_number']);
        });

        // Randomisasi soal & opsi CBT (deterministik per peserta)
        Schema::table('exams', function (Blueprint $table) {
            $table->boolean('shuffle_questions')->default(false)->after('passing_score');
            $table->boolean('shuffle_options')->default(false)->after('shuffle_questions');
        });
    }

    public function down(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->dropColumn(['shuffle_questions', 'shuffle_options']);
        });
        Schema::dropIfExists('ukmppd_results');
        Schema::dropIfExists('question_bank_items');
    }
};
