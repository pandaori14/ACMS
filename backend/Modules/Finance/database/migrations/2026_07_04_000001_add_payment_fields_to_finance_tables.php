<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pencatatan pembayaran: kapan, metode, referensi (no. transfer/kuitansi),
     * dan nomor invoice untuk tagihan RS. Tipe kolom kompatibel MySQL & PostgreSQL.
     */
    public function up(): void
    {
        Schema::table('billings', function (Blueprint $table) {
            $table->string('invoice_number', 50)->nullable()->unique()->after('status');
            $table->timestamp('paid_at')->nullable()->after('invoice_number');
            $table->string('payment_method', 50)->nullable()->after('paid_at');
            $table->string('payment_reference', 100)->nullable()->after('payment_method');
        });

        Schema::table('honorariums', function (Blueprint $table) {
            $table->timestamp('paid_at')->nullable()->after('status');
            $table->string('payment_method', 50)->nullable()->after('paid_at');
            $table->string('payment_reference', 100)->nullable()->after('payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('billings', function (Blueprint $table) {
            $table->dropColumn(['invoice_number', 'paid_at', 'payment_method', 'payment_reference']);
        });

        Schema::table('honorariums', function (Blueprint $table) {
            $table->dropColumn(['paid_at', 'payment_method', 'payment_reference']);
        });
    }
};
