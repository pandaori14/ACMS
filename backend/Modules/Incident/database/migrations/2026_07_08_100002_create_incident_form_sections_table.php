<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incident_form_sections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('form_template_id')->constrained('incident_form_templates')->cascadeOnDelete();
            $table->string('title');                              // "1. Data Pelapor"
            $table->string('icon')->nullable();                   // Lucide icon name, e.g. "user", "alert-triangle"
            $table->text('description')->nullable();              // Helper text di bawah judul section
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_visible')->default(true);

            // Conditional visibility: tampilkan section jika field tertentu bernilai X
            $table->uuid('conditional_field_id')->nullable();
            $table->string('conditional_value')->nullable();

            $table->timestamps();

            $table->index('form_template_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_form_sections');
    }
};
