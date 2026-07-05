<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT/WRITTEN online: bank soal MCQ, jawaban peserta, dan atribut waktu
     * ujian. Tipe kolom kompatibel MySQL & PostgreSQL.
     */
    public function up(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->time('start_time')->nullable()->after('date');
            $table->integer('duration_minutes')->nullable()->after('start_time');
            $table->decimal('passing_score', 5, 2)->nullable()->after('duration_minutes');
        });

        Schema::create('exam_questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('exam_id')->constrained('exams')->cascadeOnDelete();
            $table->text('question_text');
            $table->integer('points')->default(1);
            $table->integer('order')->default(1);
            $table->timestamps();
        });

        Schema::create('exam_question_options', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('exam_question_id')->constrained('exam_questions')->cascadeOnDelete();
            $table->text('option_text');
            $table->boolean('is_correct')->default(false);
            $table->integer('order')->default(1);
            $table->timestamps();
        });

        Schema::create('exam_answers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('exam_participant_id')->constrained('exam_participants')->cascadeOnDelete();
            $table->foreignUuid('exam_question_id')->constrained('exam_questions')->cascadeOnDelete();
            $table->foreignUuid('exam_question_option_id')->nullable()
                ->constrained('exam_question_options')->nullOnDelete();
            $table->timestamps();
            $table->unique(['exam_participant_id', 'exam_question_id'], 'exam_answers_participant_question_unique');
        });

        Schema::table('exam_participants', function (Blueprint $table) {
            $table->timestamp('started_at')->nullable()->after('status');
            $table->timestamp('submitted_at')->nullable()->after('started_at');
        });
    }

    public function down(): void
    {
        Schema::table('exam_participants', function (Blueprint $table) {
            $table->dropColumn(['started_at', 'submitted_at']);
        });

        Schema::dropIfExists('exam_answers');
        Schema::dropIfExists('exam_question_options');
        Schema::dropIfExists('exam_questions');

        Schema::table('exams', function (Blueprint $table) {
            $table->dropColumn(['start_time', 'duration_minutes', 'passing_score']);
        });
    }
};
