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
        Schema::create('stase_grades', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('rotation_assignment_id')->constrained('rotation_assignments')->cascadeOnDelete();
            $table->foreignUuid('student_id')->constrained('users')->cascadeOnDelete();

            $table->decimal('logbook_score', 5, 2)->default(0);
            $table->decimal('minicex_score', 5, 2)->default(0);
            $table->decimal('dops_score', 5, 2)->default(0);
            $table->decimal('cbd_score', 5, 2)->default(0);

            $table->decimal('final_score', 5, 2)->default(0);
            $table->string('letter_grade')->nullable(); // A, AB, B, etc.

            $table->string('status')->default('draft'); // draft, approved, published
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stase_grades');
    }
};
