<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incident_form_answers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('response_id')->constrained('incident_form_responses')->cascadeOnDelete();
            $table->foreignUuid('form_field_id')->constrained('incident_form_fields')->restrictOnDelete();
            $table->string('field_key');                          // Denormalized dari form_field untuk query
            $table->text('value')->nullable();                    // Jawaban — JSON string untuk multi-value (checkbox)
            $table->string('file_path')->nullable();              // Path file jika field_type=file
            $table->timestamps();

            $table->index('response_id');
            $table->index('form_field_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_form_answers');
    }
};
