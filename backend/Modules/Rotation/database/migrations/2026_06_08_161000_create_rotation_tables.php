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
        Schema::create('hospitals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 20)->unique();
            $table->string('name', 255);
            $table->string('type', 50); // e.g. Utama, Satelit, Afiliasi
            $table->text('address')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('rotation_periods', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('program_id')->constrained('programs')->onDelete('cascade');
            $table->string('name', 255);
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status', 50); // e.g. draft, published, active, completed
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('hospital_capacities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hospital_id')->constrained('hospitals')->onDelete('cascade');
            $table->foreignUuid('stase_id')->constrained('stases')->onDelete('cascade');
            $table->foreignUuid('rotation_period_id')->nullable()->constrained('rotation_periods')->onDelete('cascade');
            $table->integer('max_students');
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('rotation_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('rotation_period_id')->constrained('rotation_periods')->onDelete('cascade');
            $table->foreignUuid('student_id')->constrained('students')->onDelete('cascade');
            $table->foreignUuid('stase_id')->constrained('stases')->onDelete('cascade');
            $table->foreignUuid('hospital_id')->constrained('hospitals')->onDelete('cascade');
            $table->foreignUuid('preceptor_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('status', 50); // e.g. pending, confirmed, in_progress, completed, remedial
            $table->decimal('final_score', 5, 2)->nullable();
            $table->string('final_grade', 5)->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rotation_assignments');
        Schema::dropIfExists('hospital_capacities');
        Schema::dropIfExists('rotation_periods');
        Schema::dropIfExists('hospitals');
    }
};
