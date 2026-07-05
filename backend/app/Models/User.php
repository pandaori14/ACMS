<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Laravel\Sanctum\HasApiTokens;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Student;
use Modules\Rotation\Models\Hospital;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, HasUuids, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'address',
        'provider_name',
        'provider_id',
        'identity_number',
        'status',
        'program_id',
        'hospital_id',
    ];

    /**
     * Get the program associated with the user.
     */
    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    public function hospitals()
    {
        return $this->belongsToMany(Hospital::class);
    }

    /**
     * ID rumah sakit yang tertaut ke user (Dodiknis/Admin RS):
     * pivot hospital_user; fallback kolom legacy users.hospital_id.
     * Dipakai untuk scoping baris lintas modul.
     */
    public function linkedHospitalIds(): Collection
    {
        $ids = $this->hospitals()->pluck('hospitals.id');

        if ($ids->isEmpty() && $this->hospital_id) {
            $ids = collect([$this->hospital_id]);
        }

        return $ids;
    }

    /**
     * Get the student profile associated with the user.
     */
    public function student()
    {
        return $this->hasOne(Student::class);
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
