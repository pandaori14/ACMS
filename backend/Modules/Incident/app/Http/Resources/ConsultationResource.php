<?php

namespace Modules\Incident\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Kontrak presentasi tunggal untuk konsultasi.
 *
 * Saat ini meneruskan atribut model apa adanya (bentuk payload dipertahankan),
 * berfungsi sebagai seam terpusat untuk pemformatan/penyembunyian field di
 * masa depan tanpa menyebar ke controller.
 */
class ConsultationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return parent::toArray($request);
    }
}
