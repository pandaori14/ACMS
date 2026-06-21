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
        Schema::create('system_references', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('category')->index(); // e.g. incident_types, exam_types
            $table->string('name');              // e.g. "Bullying"
            $table->string('value');             // e.g. "bullying"
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_references');
    }
};
