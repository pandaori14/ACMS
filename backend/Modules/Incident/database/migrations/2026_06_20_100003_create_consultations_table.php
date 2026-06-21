<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consultations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('requester_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('category');
            $table->string('topic');
            $table->text('message');
            $table->boolean('is_anonymous')->default(false);
            $table->string('status')->default('pending');
            $table->text('response')->nullable();
            $table->foreignUuid('responded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultations');
    }
};
