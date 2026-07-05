<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tracking kompetensi: target minimal kasus per kompetensi (master) +
     * tautan logbook → kompetensi (capaian dihitung dari logbook verified).
     * Kompatibel MySQL & PostgreSQL.
     */
    public function up(): void
    {
        Schema::table('competencies', function (Blueprint $table) {
            $table->integer('min_cases')->default(1)->after('level');
        });

        Schema::table('logbook_entries', function (Blueprint $table) {
            $table->foreignUuid('competency_id')->nullable()
                ->after('procedure_id')
                ->constrained('competencies')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('logbook_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('competency_id');
        });

        Schema::table('competencies', function (Blueprint $table) {
            $table->dropColumn('min_cases');
        });
    }
};
