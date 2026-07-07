<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Permintaan tukar penempatan rotasi antar dua mahasiswa (se-periode):
        // mahasiswa mengajukan → admin rotasi memutuskan → slot ditukar atomik.
        Schema::create('rotation_swap_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('requester_assignment_id')->constrained('rotation_assignments')->onDelete('cascade');
            $table->foreignUuid('target_assignment_id')->constrained('rotation_assignments')->onDelete('cascade');
            $table->text('reason');
            $table->string('status', 30)->default('submitted'); // submitted|approved|rejected|cancelled
            $table->foreignUuid('decided_by')->nullable()->constrained('users');
            $table->text('decision_note')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rotation_swap_requests');
    }
};
