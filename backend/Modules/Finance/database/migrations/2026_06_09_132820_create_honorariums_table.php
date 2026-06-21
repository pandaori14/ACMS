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
        Schema::create('honorariums', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('preceptor_id')->constrained('users');
            $table->string('period', 50); // e.g. "Q1-2026"
            $table->decimal('amount', 15, 2);
            $table->string('status')->default('PENDING'); // PENDING, PAID
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('honorariums');
    }
};
