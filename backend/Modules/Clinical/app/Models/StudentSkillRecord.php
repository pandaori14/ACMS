<?php

namespace Modules\Clinical\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Academic\Models\Student;

/**
 * Observasi skill seorang mahasiswa terhadap satu item checklist —
 * menyimpan level TERAKHIR (observasi ulang menimpa).
 * student_id = students.id (profil); assessed_by = users.id.
 */
class StudentSkillRecord extends Model
{
    use HasUuids;

    protected $fillable = [
        'skill_checklist_item_id',
        'student_id',
        'level',
        'assessed_by',
        'assessed_at',
        'notes',
    ];

    protected $casts = [
        'assessed_at' => 'datetime',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(SkillChecklistItem::class, 'skill_checklist_item_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function assessor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assessed_by');
    }
}
