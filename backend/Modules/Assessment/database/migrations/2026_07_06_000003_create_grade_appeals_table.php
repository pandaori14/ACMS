<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Jendela banding dihitung dari saat nilai terbit
        Schema::table('stase_grades', function (Blueprint $table) {
            $table->timestamp('published_at')->nullable()->after('status');
        });

        Schema::create('grade_appeals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('stase_grade_id')->constrained('stase_grades')->onDelete('cascade');
            // users.id — selaras stase_grades.student_id (jebakan dual-ID)
            $table->foreignUuid('student_id')->constrained('users')->onDelete('cascade');
            $table->text('reason');
            $table->string('status', 30)->default('submitted'); // submitted|accepted|rejected
            $table->foreignUuid('reviewer_id')->nullable()->constrained('users');
            $table->text('decision_note')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();

            // Satu banding per nilai stase
            $table->unique('stase_grade_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grade_appeals');
        Schema::table('stase_grades', function (Blueprint $table) {
            $table->dropColumn('published_at');
        });
    }
};
