<?php

namespace Modules\Incident\Services;

use App\Models\Setting;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Pagination\LengthAwarePaginator;
use Modules\Incident\Models\Consultation;

class ConsultationService
{
    public function list(array $filters, User $user): LengthAwarePaginator
    {
        $perPage = (int) Setting::getValue('items_per_page', 20);
        $isManager = $user->can('manage-consultations');
        $canSeeAnonymous = $user->can('view-anonymous-identity');

        $query = Consultation::with(['requester:id,name,email', 'responder:id,name'])
            ->when(! $isManager, fn ($q) => $q->where('requester_id', $user->id))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['category'] ?? null, fn ($q, $v) => $q->where('category', $v))
            ->latest();

        $paginated = $query->paginate($perPage);

        $paginated->through(function (Consultation $consultation) use ($canSeeAnonymous) {
            if ($consultation->is_anonymous && ! $canSeeAnonymous) {
                $consultation->unsetRelation('requester');
                $consultation->requester_id = null;
            }

            return $consultation;
        });

        return $paginated;
    }

    public function store(array $data, User $user): Consultation
    {
        if (! empty($data['is_anonymous'])) {
            $data['requester_id'] = null;
        } else {
            $data['requester_id'] = $user->id;
        }

        $data['status'] = 'pending';
        $consultation = Consultation::create($data);

        NotificationService::sendDynamicEmail(
            null,
            'Konsultasi Baru: '.$consultation->topic,
            'email_template_welcome',
            'consultation_submitted',
            [
                'name' => 'Tim ACMS',
                'category' => $consultation->category,
                'topic' => $consultation->topic,
            ],
            ['category' => $consultation->category]
        );

        return $consultation;
    }

    public function show(string $id, User $user): Consultation
    {
        $consultation = Consultation::with([
            'requester:id,name,email',
            'responder:id,name',
        ])->findOrFail($id);

        $isManager = $user->can('manage-consultations');
        $canSeeAnonymous = $user->can('view-anonymous-identity');

        if (! $isManager && $consultation->requester_id !== $user->id) {
            abort(403, 'Anda tidak memiliki akses ke konsultasi ini.');
        }

        if ($consultation->is_anonymous && ! $canSeeAnonymous) {
            $consultation->unsetRelation('requester');
            $consultation->requester_id = null;
        }

        return $consultation;
    }

    public function respond(string $id, string $response, string $status, User $user): Consultation
    {
        if (! $user->can('manage-consultations')) {
            abort(403, 'Anda tidak memiliki akses untuk merespons konsultasi.');
        }

        $consultation = Consultation::with('requester:id,name,email')->findOrFail($id);
        $consultation->update([
            'response' => $response,
            'status' => $status,
            'responded_by' => $user->id,
            'responded_at' => now(),
        ]);

        // Tutup loop: beri tahu pengaju (jika tidak anonim) bahwa konsultasinya telah dibalas.
        if (! $consultation->is_anonymous && $consultation->requester && $consultation->requester->email) {
            NotificationService::sendDynamicEmail(
                $consultation->requester->email,
                'Konsultasi Anda Telah Direspons',
                'email_template_welcome',
                'consultation_responded',
                [
                    'name' => $consultation->requester->name,
                    'topic' => $consultation->topic,
                ],
                ['category' => $consultation->category]
            );
        }

        return $consultation->fresh(['requester:id,name,email', 'responder:id,name']);
    }
}
