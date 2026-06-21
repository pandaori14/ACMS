<?php

namespace Modules\Finance\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Modules\Finance\Models\Billing;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationAssignment;

class CalculateHospitalBilling implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $period;

    protected $startDate;

    protected $endDate;

    protected $rate;

    /**
     * Create a new job instance.
     */
    public function __construct($period, $startDate, $endDate, $rate)
    {
        $this->period = $period;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->rate = $rate;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $hospitals = Hospital::all();

        foreach ($hospitals as $hospital) {
            $studentCount = RotationAssignment::where('hospital_id', $hospital->id)
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

            if ($studentCount > 0) {
                $amount = $studentCount * $this->rate;

                Billing::updateOrCreate(
                    ['hospital_id' => $hospital->id, 'period' => $this->period],
                    [
                        'amount' => $amount,
                        'status' => 'PENDING',
                        'notes' => "Tagihan otomatis. Total Mahasiswa: $studentCount",
                    ]
                );
            }
        }
    }
}
