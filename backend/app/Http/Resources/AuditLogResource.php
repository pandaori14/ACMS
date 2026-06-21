<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'action' => $this->action,
            'actor' => $this->whenLoaded('actor', fn () => $this->actor ? [
                'id' => $this->actor->id,
                'name' => $this->actor->name,
                'email' => $this->actor->email,
            ] : null),
            'actor_id' => $this->actor_id,
            'actor_role' => $this->actor_role,
            'target_type' => $this->target_type ? class_basename($this->target_type) : null,
            'target_fqcn' => $this->target_type,
            'target_id' => $this->target_id,
            'old_payload' => $this->old_payload,
            'new_payload' => $this->new_payload,
            'metadata' => $this->metadata,
            'ip_address' => $this->ip_address,
            'created_at' => $this->created_at,
        ];
    }
}
