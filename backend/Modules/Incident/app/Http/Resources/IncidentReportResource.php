<?php

namespace Modules\Incident\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Kontrak presentasi tunggal untuk laporan insiden.
 *
 * Mempertahankan bentuk payload yang ada (atribut model + relasi yang termuat)
 * sambil MENEGAKKAN masking identitas pelapor anonim di batas presentasi —
 * pertahanan berlapis: walau pemanggil lupa memfilter, identitas tetap aman
 * untuk pengguna tanpa izin `view-anonymous-identity`.
 */
class IncidentReportResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = parent::toArray($request);

        $canSeeAnonymous = $request->user()?->can('view-anonymous-identity') ?? false;

        if (($this->is_anonymous ?? false) && ! $canSeeAnonymous) {
            $data['reporter_id'] = null;
            unset($data['reporter']);
        }

        return $data;
    }
}
