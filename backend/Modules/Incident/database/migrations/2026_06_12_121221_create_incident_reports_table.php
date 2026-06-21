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
        Schema::create('incident_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('reporter_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('incident_type'); // student_safety, patient_safety, bullying, other
            $table->date('incident_date');
            $table->string('location');
            $table->text('description');
            $table->text('involved_parties')->nullable();
            $table->boolean('is_anonymous')->default(false);
            $table->string('status')->default('submitted'); // submitted, investigating, resolved
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incident_reports');
    }
};
