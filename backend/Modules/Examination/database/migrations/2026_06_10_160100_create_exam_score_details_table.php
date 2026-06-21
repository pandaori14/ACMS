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
        Schema::create('exam_score_details', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('exam_score_id')->constrained('exam_scores')->cascadeOnDelete();
            $table->string('rubric_key'); // Matches keys in the template's rubric_schema
            $table->decimal('score', 5, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_score_details');
    }
};
