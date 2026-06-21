<?php

namespace Modules\Incident\Services;

use App\Models\Setting;
use App\Models\User;
use App\Notifications\NewIncidentNotification;
use App\Services\NotificationService;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Modules\Incident\Models\IncidentNote;
use Modules\Incident\Models\IncidentReport;

class IncidentService
{
    public function list(array $filters, User $user): LengthAwarePaginator
    {
        $perPage = (int) Setting::getValue('items_per_page', 20);
        $isManager = $user->can('manage-incidents');
        $canSeeAnonymous = $user->can('view-anonymous-identity');

        $query = IncidentReport::with(['reporter:id,name,email'])
            ->when(! $isManager, fn ($q) => $q->where('reporter_id', $user->id))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['incident_type'] ?? null, fn ($q, $v) => $q->where('incident_type', $v))
            ->when($filters['severity'] ?? null, fn ($q, $v) => $q->where('severity', $v))
            ->when($filters['date_from'] ?? null, fn ($q, $v) => $q->whereDate('incident_date', '>=', $v))
            ->when($filters['date_to'] ?? null, fn ($q, $v) => $q->whereDate('incident_date', '<=', $v))
            ->latest();

        $paginated = $query->paginate($perPage);

        $paginated->through(function (IncidentReport $report) use ($canSeeAnonymous) {
            if ($report->is_anonymous && ! $canSeeAnonymous) {
                $report->unsetRelation('reporter');
                $report->reporter_id = null;
            }

            return $report;
        });

        return $paginated;
    }

    public function store(array $data, ?UploadedFile $attachment, User $user): IncidentReport
    {
        if (! empty($data['is_anonymous'])) {
            $data['reporter_id'] = null;
        } else {
            $data['reporter_id'] = $user->id;
        }

        $data['status'] = 'submitted';

        if ($attachment) {
            $data['attachment_path'] = $attachment->store('incident-attachments', 'public');
        }

        unset($data['attachment']);
        $report = IncidentReport::create($data);

        // Email ke penerima yang dikonfigurasi (matrix incident_reported: roles + cc + conditional).
        NotificationService::sendDynamicEmail(
            null,
            'Laporan Insiden Baru: '.$report->incident_type,
            'email_template_welcome',
            'incident_reported',
            [
                'name' => 'Tim ACMS',
                'incident_type' => $report->incident_type,
                'location' => $report->location,
            ],
            ['incident_type' => $report->incident_type]
        );

        // Notifikasi IN-APP ke pihak yang ditugaskan (role yang sama dengan penerima email).
        $this->notifyAssignedRoles($report);

        return $report;
    }

    /**
     * Kirim notifikasi in-app (database) ke seluruh user pada role yang dikonfigurasi
     * sebagai penerima notifikasi pelaporan insiden (matrix incident_reported.notify_roles).
     */
    private function notifyAssignedRoles(IncidentReport $report): void
    {
        $matrixStr = Setting::getValue('smtp_notification_matrix');
        $matrix = $matrixStr ? json_decode($matrixStr, true) : [];
        $roles = $matrix['incident_reported']['notify_roles'] ?? [];

        if (empty($roles) || ! is_array($roles)) {
            return;
        }

        $recipients = User::role($roles)->get();
        if ($recipients->isEmpty()) {
            return;
        }

        $typeLabel = ucwords(str_replace('_', ' ', $report->incident_type));

        Notification::send($recipients, new NewIncidentNotification([
            'title' => 'Laporan Insiden Baru',
            'message' => "{$typeLabel} dilaporkan di {$report->location}.",
            'url' => "/dashboard/incidents/{$report->id}",
            'type' => $report->severity === 'critical' ? 'warning' : 'info',
        ]));
    }

    public function show(string $id, User $user): IncidentReport
    {
        // Catatan investigasi TIDAK di-eager-load di sini agar catatan internal
        // tidak bocor ke pelapor. Catatan diakses terpisah via endpoint /notes (manager-only).
        $report = IncidentReport::with(['reporter:id,name,email'])->findOrFail($id);

        $isManager = $user->can('manage-incidents');
        $canSeeAnonymous = $user->can('view-anonymous-identity');

        if (! $isManager && $report->reporter_id !== $user->id) {
            abort(403, 'Anda tidak memiliki akses ke laporan ini.');
        }

        if ($report->is_anonymous && ! $canSeeAnonymous) {
            $report->unsetRelation('reporter');
            $report->reporter_id = null;
        }

        return $report;
    }

    public function updateStatus(string $id, string $status, ?string $resolutionNotes, User $user): IncidentReport
    {
        if (! $user->can('manage-incidents')) {
            abort(403, 'Anda tidak memiliki akses untuk memperbarui status laporan.');
        }

        $report = IncidentReport::with('reporter:id,name,email')->findOrFail($id);
        $report->status = $status;

        if ($status === 'resolved' && $resolutionNotes) {
            $report->resolution_notes = $resolutionNotes;
        }

        $report->save();

        // Tutup loop: beri tahu pelapor (jika tidak anonim) bahwa status laporannya berubah.
        if (! $report->is_anonymous && $report->reporter && $report->reporter->email) {
            NotificationService::sendDynamicEmail(
                $report->reporter->email,
                'Pembaruan Status Laporan Insiden Anda',
                'email_template_welcome',
                'incident_status_updated',
                [
                    'name' => $report->reporter->name,
                    'status' => $status,
                    'incident_type' => $report->incident_type,
                ],
                ['status' => $status]
            );
        }

        return $report;
    }

    public function addNote(string $incidentId, string $note, bool $isInternal, User $user): IncidentNote
    {
        if (! $user->can('manage-incidents')) {
            abort(403, 'Anda tidak memiliki akses untuk menambahkan catatan.');
        }

        $report = IncidentReport::findOrFail($incidentId);

        return $report->notes()->create([
            'user_id' => $user->id,
            'note' => $note,
            'is_internal' => $isInternal,
        ]);
    }

    public function statistics(User $user): array
    {
        $isManager = $user->can('manage-incidents');
        $baseQuery = $isManager
            ? IncidentReport::query()
            : IncidentReport::where('reporter_id', $user->id);

        $byStatus = (clone $baseQuery)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $byType = (clone $baseQuery)
            ->selectRaw('incident_type, COUNT(*) as count')
            ->groupBy('incident_type')
            ->pluck('count', 'incident_type')
            ->toArray();

        $bySeverity = (clone $baseQuery)
            ->whereNotNull('severity')
            ->selectRaw('severity, COUNT(*) as count')
            ->groupBy('severity')
            ->pluck('count', 'severity')
            ->toArray();

        $trend = (clone $baseQuery)
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->toArray();

        return [
            'total' => (clone $baseQuery)->count(),
            'by_status' => $byStatus,
            'by_type' => $byType,
            'by_severity' => $bySeverity,
            'trend_30_days' => $trend,
        ];
    }

    public function downloadAttachment(string $id, User $user): array
    {
        $report = IncidentReport::findOrFail($id);
        $isManager = $user->can('manage-incidents');

        if (! $isManager && $report->reporter_id !== $user->id) {
            abort(403);
        }

        if (! $report->attachment_path || ! Storage::disk('public')->exists($report->attachment_path)) {
            abort(404, 'Lampiran tidak ditemukan.');
        }

        return [
            'path' => Storage::disk('public')->path($report->attachment_path),
            'filename' => basename($report->attachment_path),
        ];
    }
}
