<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logbook_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('rotation_assignment_id');
            $table->uuid('student_id');
            $table->uuid('preceptor_id')->nullable(); // Assigned Dodiknis
            $table->date('activity_date');
            $table->string('activity_type', 50); // 'case', 'procedure', 'duty'
            $table->text('description');
            $table->string('patient_initials', 10)->nullable();
            $table->string('medical_record_no', 50)->nullable();
            $table->uuid('diagnosis_id')->nullable();
            $table->uuid('procedure_id')->nullable();
            $table->string('competency_level', 20)->nullable(); // '1' (observe), '2' (assist), '3' (perform supervised), '4' (perform independent)
            $table->text('preceptor_feedback')->nullable();
            $table->string('status', 50)->default('draft'); // 'draft', 'submitted', 'verified', 'rejected'
            $table->string('attachment_path')->nullable(); // file upload path
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('rotation_assignment_id')->references('id')->on('rotation_assignments')->onDelete('cascade');
            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $table->foreign('preceptor_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('diagnosis_id')->references('id')->on('diagnoses')->onDelete('set null');
            $table->foreign('procedure_id')->references('id')->on('procedures')->onDelete('set null');

            $table->index(['student_id', 'activity_date']);
            $table->index(['rotation_assignment_id', 'status']);
            $table->index('preceptor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logbook_entries');
    }
};
