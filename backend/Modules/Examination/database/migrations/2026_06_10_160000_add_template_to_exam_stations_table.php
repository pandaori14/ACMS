<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('exam_stations', function (Blueprint $table) {
            $table->foreignUuid('assessment_template_id')->nullable()->constrained('assessment_templates')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('exam_stations', function (Blueprint $table) {
            $table->dropForeign(['assessment_template_id']);
            $table->dropColumn('assessment_template_id');
        });
    }
};
