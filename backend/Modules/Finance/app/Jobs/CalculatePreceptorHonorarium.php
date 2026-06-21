<?php

namespace Modules\Finance\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Modules\Finance\Models\Honorarium;
use Modules\Rotation\Models\RotationAssignment;

class CalculatePreceptorHonorarium implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $period;

    protected $startDate;

    protected $endDate;

    protected $guidanceRate;

    protected $examRate;

    /**
     * Create a new job instance.
     */
    public function __construct($period, $startDate, $endDate, $guidanceRate, $examRate)
    {
        $this->period = $period;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->guidanceRate = $guidanceRate;
        $this->examRate = $examRate;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $preceptors = User::role('Dodiknis')->get();

        foreach ($preceptors as $preceptor) {
            $supervisedStudents = RotationAssignment::where('preceptor_id', $preceptor->id)
                ->whereHas('rotationPeriod', function ($q) {
                    $q->whereBetween('start_date', [$this->startDate, $this->endDate])
                        ->orWhereBetween('end_date', [$this->startDate, $this->endDate])
                        ->orWhere(function ($q2) {
                            $q2->where('start_date', '<=', $this->startDate)
                                ->where('end_date', '>=', $this->endDate);
                        });
                })
                ->distinct('student_id')
                ->count('student_id');

            $examsAssessed = DB::table('exam_scores')
                ->join('exam_participants', 'exam_scores.exam_participant_id', '=', 'exam_participants.id')
                ->join('exams', 'exam_participants.exam_id', '=', 'exams.id')
                ->where('exam_scores.assessor_id', $preceptor->id)
                ->whereBetween('exams.date', [$this->startDate, $this->endDate])
                ->distinct('exam_participants.id')
                ->count('exam_participants.id');

            if ($supervisedStudents > 0 || $examsAssessed > 0) {
                $amount = ($supervisedStudents * $this->guidanceRate) + ($examsAssessed * $this->examRate);

                Honorarium::updateOrCreate(
                    ['preceptor_id' => $preceptor->id, 'period' => $this->period],
                    [
                        'amount' => $amount,
                        'status' => 'PENDING',
                        'notes' => "Tagihan otomatis. Bimbingan: $supervisedStudents mhs, Ujian: $examsAssessed mhs",
                    ]
                );
            }
        }
    }
}
