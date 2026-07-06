<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tracking remedial: percobaan ke-berapa mahasiswa menjalani stase ini
        // (1 = pertama; >1 = mengulang/remedial). Diisi otomatis oleh scheduler.
        Schema::table('rotation_assignments', function (Blueprint $table) {
            $table->unsignedTinyInteger('attempt_number')->default(1)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('rotation_assignments', function (Blueprint $table) {
            $table->dropColumn('attempt_number');
        });
    }
};
