<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('academic_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title', 255);
            // Nilai dari system_references kategori academic_event_types (Aturan B)
            $table->string('event_type', 50);
            $table->date('start_date');
            $table->date('end_date');
            $table->text('description')->nullable();
            // true = periode blackout: penempatan rotasi yang tumpang tindih ditolak
            $table->boolean('blocks_rotation')->default(false);
            $table->timestamps();

            $table->index(['start_date', 'end_date']);
            $table->index('blocks_rotation');
        });

        // Prasyarat stase: daftar id stase yang harus SELESAI sebelum stase ini
        Schema::table('stases', function (Blueprint $table) {
            $table->json('prerequisite_stase_ids')->nullable()->after('is_mandatory');
        });
    }

    public function down(): void
    {
        Schema::table('stases', function (Blueprint $table) {
            $table->dropColumn('prerequisite_stase_ids');
        });
        Schema::dropIfExists('academic_events');
    }
};
