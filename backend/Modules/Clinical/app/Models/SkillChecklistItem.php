<?php

namespace Modules\Clinical\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Academic\Models\Stase;

/** Item skill checklist per stase — template observasi keterampilan klinis. */
class SkillChecklistItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'stase_id',
        'name',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function stase(): BelongsTo
    {
        return $this->belongsTo(Stase::class);
    }

    public function records(): HasMany
    {
        return $this->hasMany(StudentSkillRecord::class, 'skill_checklist_item_id');
    }
}
