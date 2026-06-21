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
        Schema::create('clinical_assessments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('rotation_assignment_id')->constrained('rotation_assignments')->cascadeOnDelete();
            $table->foreignUuid('assessment_template_id')->constrained('assessment_templates')->cascadeOnDelete();
            $table->foreignUuid('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('preceptor_id')->constrained('users')->cascadeOnDelete();
            $table->date('assessment_date');
            $table->decimal('total_score', 5, 2)->default(0);
            $table->text('feedback_notes')->nullable();
            $table->string('status')->default('draft'); // draft, submitted, acknowledged
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinical_assessments');
    }
};
