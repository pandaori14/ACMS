<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incident_form_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('incident_type');           // FK logic ke system_references.value where category=incident_types
            $table->string('name');                     // "Formulir K3 Dokter Muda FK UMS"
            $table->text('description')->nullable();    // Subtitle/deskripsi singkat
            $table->string('header_title');             // Judul besar di header card
            $table->text('header_subtitle')->nullable();// Teks di bawah judul header
            $table->string('theme_color', 7)->default('#1E3A8A'); // Hex warna utama
            $table->boolean('is_active')->default(false);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            // 1 template aktif per jenis insiden
            $table->index(['incident_type', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_form_templates');
    }
};
