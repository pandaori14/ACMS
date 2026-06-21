<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            $table->string('severity')->nullable()->after('status');
            $table->text('resolution_notes')->nullable()->after('severity');
            $table->string('attachment_path')->nullable()->after('resolution_notes');
        });
    }

    public function down(): void
    {
        Schema::table('incident_reports', function (Blueprint $table) {
            $table->dropColumn(['severity', 'resolution_notes', 'attachment_path']);
        });
    }
};
