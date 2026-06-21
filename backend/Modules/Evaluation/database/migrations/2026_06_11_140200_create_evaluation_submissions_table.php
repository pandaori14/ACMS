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
        Schema::create('evaluation_submissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete(); // student is anonymous in view, but stored here to prevent double submission
            $table->foreignUuid('rotation_assignment_id')->constrained('rotation_assignments')->cascadeOnDelete();

            // Target can be either Preceptor (User) or Hospital
            $table->uuid('target_id');
            $table->string('target_type'); // 'App\Models\User' (for Preceptor) or 'Modules\Rotation\Models\Hospital'

            $table->foreignUuid('evaluation_question_id')->constrained('evaluation_questions')->cascadeOnDelete();

            $table->integer('rating'); // 1 to 5
            $table->text('comment')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_submissions');
    }
};
