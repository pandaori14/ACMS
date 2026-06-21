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
        Schema::create('faculties', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 255);
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('programs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('faculty_id')->constrained('faculties')->onDelete('cascade');
            $table->string('code', 20)->unique();
            $table->string('name', 255);
            $table->string('accreditation', 10)->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('stases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('program_id')->constrained('programs')->onDelete('cascade');
            $table->string('code', 20);
            $table->string('name', 255);
            $table->integer('duration_weeks');
            $table->decimal('passing_grade', 5, 2);
            $table->boolean('is_mandatory')->default(true);
            $table->string('color_code', 7)->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('cohorts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('program_id')->constrained('programs')->onDelete('cascade');
            $table->string('name', 255);
            $table->integer('year');
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('students', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->foreignUuid('program_id')->constrained('programs')->onDelete('cascade');
            $table->foreignUuid('cohort_id')->constrained('cohorts')->onDelete('cascade');
            $table->string('status', 50); // e.g. active, leave, graduated, dropout
            $table->date('enrollment_date');
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('students');
        Schema::dropIfExists('cohorts');
        Schema::dropIfExists('stases');
        Schema::dropIfExists('programs');
        Schema::dropIfExists('faculties');
    }
};
