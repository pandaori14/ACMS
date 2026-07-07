<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Broadcast pesan massal (in-app + email opsional) oleh pengelola
        Schema::create('broadcasts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('sender_id')->constrained('users');
            $table->string('subject', 255);
            $table->text('body');
            $table->string('target_type', 30); // all|role|cohort|hospital
            $table->string('target_id')->nullable(); // nama role / uuid cohort / uuid hospital
            $table->unsignedInteger('recipients_count')->default(0);
            $table->timestamps();
        });

        // Preferensi notifikasi EMAIL per user per event matrix
        // (in-app tetap selalu masuk; email kritis tidak bisa dimatikan)
        Schema::create('user_notification_preferences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            $table->string('event_type', 60);
            $table->boolean('email_enabled')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'event_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_notification_preferences');
        Schema::dropIfExists('broadcasts');
    }
};
