<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnoses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('icd_code', 20)->unique(); // e.g. 'A01.0'
            $table->string('name', 500);
            $table->string('category', 100)->nullable(); // e.g. 'Infectious', 'Cardiovascular'
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnoses');
    }
};
