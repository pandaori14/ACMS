<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Penanda retensi PII: laporan lama yang sudah dianonimkan permanen
     * (reporter dihapus + lampiran dimusnahkan) oleh incidents:prune-pii.
     */
    public function up(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            $table->timestamp('anonymized_at')->nullable()->after('attachment_path');
        });
    }

    public function down(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            $table->dropColumn('anonymized_at');
        });
    }
};
