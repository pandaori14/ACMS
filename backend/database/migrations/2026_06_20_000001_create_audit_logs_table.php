<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Append-only audit trail table.
     *
     * NOTE: ARCHITECTURE.md / AUDIT_TRAIL_SPEC.md target PostgreSQL (JSONB, INET,
     * declarative partitioning, table-level immutability triggers). This migration
     * uses MySQL-compatible types per CLAUDE.md Rule D:
     *   - JSONB  -> json
     *   - INET   -> string(45) (fits IPv6)
     *   - Partitioning / triggers omitted (handled at app layer; model blocks UPDATE/DELETE).
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary(); // ordered UUID for time-sortable inserts
            $table->uuid('program_id')->nullable();   // tenant isolation (Kaprodi scope)
            $table->uuid('actor_id')->nullable();      // NULL for system/cron actions
            $table->string('actor_role', 50)->nullable();
            $table->string('action', 100);             // standardized event name
            $table->string('target_type', 150)->nullable(); // FQCN, e.g. Modules\Clinical\Models\LogbookEntry
            $table->uuid('target_id')->nullable();
            $table->json('old_payload')->nullable();   // dirty state before
            $table->json('new_payload')->nullable();   // dirty state after
            $table->json('metadata')->nullable();      // extra context
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('previous_hash', 64)->nullable(); // chain link
            $table->string('hash', 64);                      // SHA-256 signature
            $table->timestamp('created_at')->nullable();     // no updated_at: append-only

            $table->index(['target_type', 'target_id'], 'idx_audit_target');
            $table->index('actor_id', 'idx_audit_actor');
            $table->index('action', 'idx_audit_action');
            $table->index('created_at', 'idx_audit_created_at');
            $table->index('program_id', 'idx_audit_program');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
