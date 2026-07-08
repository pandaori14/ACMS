<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incident_form_responses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('incident_report_id')->constrained('incident_reports')->cascadeOnDelete();
            $table->foreignUuid('form_template_id')->constrained('incident_form_templates')->restrictOnDelete();
            $table->unsignedInteger('form_template_version');     // Snapshot versi template saat submit
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->index('incident_report_id');
            $table->index('form_template_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_form_responses');
    }
};
