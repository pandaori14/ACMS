<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incident_form_fields', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('section_id')->constrained('incident_form_sections')->cascadeOnDelete();
            $table->string('label');                              // "Nama & NIM"
            $table->string('field_key');                          // Slug unik per template, e.g. "nim_nama"
            $table->string('field_type');                         // text, textarea, select, multiselect, checkbox, radio, date, datetime, email, tel, file, statement
            $table->string('placeholder')->nullable();            // "Ketik min. 3 huruf untuk mencari..."
            $table->text('help_text')->nullable();                // Teks bantuan kecil di bawah field
            $table->boolean('is_required')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->json('options')->nullable();                  // Untuk select/checkbox/radio: [{"value":"x","label":"Y"},...]
            $table->json('validation_rules')->nullable();         // {"min":3,"max":500,"pattern":"[0-9]+"}
            $table->unsignedTinyInteger('grid_cols')->default(1); // 1 = full width, 2 = half width (grid 2-col)
            $table->timestamps();

            $table->index('section_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_form_fields');
    }
};
