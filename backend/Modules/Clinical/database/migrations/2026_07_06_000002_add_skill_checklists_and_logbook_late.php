<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Flag keterlambatan submit logbook (ambang hari dari Settings)
        Schema::table('logbook_entries', function (Blueprint $table) {
            $table->boolean('is_late')->default(false)->after('status');
            $table->integer('late_days')->nullable()->after('is_late');
        });

        // Template skill checklist per stase (7 area kompetensi KKI dsb.)
        Schema::create('skill_checklist_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('stase_id')->constrained('stases')->onDelete('cascade');
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('stase_id');
        });

        // Rekam observasi skill per mahasiswa (satu baris per item per mahasiswa,
        // observasi ulang menimpa — menyimpan level TERAKHIR)
        Schema::create('student_skill_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('skill_checklist_item_id')->constrained('skill_checklist_items')->onDelete('cascade');
            // students.id (profil) — selaras logbook/attendance (jebakan dual-ID)
            $table->foreignUuid('student_id')->constrained('students')->onDelete('cascade');
            // Nilai dari system_references kategori skill_levels
            $table->string('level', 50);
            $table->foreignUuid('assessed_by')->constrained('users');
            $table->timestamp('assessed_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['skill_checklist_item_id', 'student_id'], 'skill_record_item_student_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_skill_records');
        Schema::dropIfExists('skill_checklist_items');
        Schema::table('logbook_entries', function (Blueprint $table) {
            $table->dropColumn(['is_late', 'late_days']);
        });
    }
};
