<?php

namespace Modules\Academic\Services;

use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Modules\Academic\Models\Student;

class StudentService
{
    /**
     * Buat akun User (role Mahasiswa) + profil Student dalam satu transaksi.
     *
     * @param  array{name:string,email:string,identity_number:string,password?:string,program_id:string,cohort_id:string,status:string,enrollment_date:string}  $data
     */
    public function createStudent(array $data): Student
    {
        $plainPassword = $data['password'] ?? Str::password(12, letters: true, numbers: true, symbols: false);

        $student = DB::transaction(function () use ($data, $plainPassword) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($plainPassword),
                'identity_number' => $data['identity_number'],
                'status' => 'active',
                'program_id' => $data['program_id'],
            ]);
            $user->syncRoles(['Mahasiswa']);

            return Student::create([
                'user_id' => $user->id,
                'program_id' => $data['program_id'],
                'cohort_id' => $data['cohort_id'],
                'status' => $data['status'],
                'enrollment_date' => $data['enrollment_date'],
            ]);
        });

        NotificationService::sendDynamicEmail(
            $data['email'],
            'Selamat Datang di ACMS',
            'email_template_welcome',
            'new_account',
            [
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $plainPassword,
                'link' => url('/login'),
            ]
        );

        return $student->load(['user', 'program', 'cohort']);
    }

    /**
     * Perbarui profil Student + data User terkait.
     */
    public function updateStudent(Student $student, array $data): Student
    {
        DB::transaction(function () use ($student, $data) {
            $userFields = array_intersect_key($data, array_flip(['name', 'email', 'identity_number']));
            if (! empty($data['password'])) {
                $userFields['password'] = Hash::make($data['password']);
            }
            if ($userFields !== []) {
                $student->user->update($userFields);
            }

            $studentFields = array_intersect_key($data, array_flip(['program_id', 'cohort_id', 'status', 'enrollment_date']));
            if ($studentFields !== []) {
                if (isset($studentFields['program_id'])) {
                    $student->user->update(['program_id' => $studentFields['program_id']]);
                }
                $student->update($studentFields);
            }
        });

        return $student->fresh(['user', 'program', 'cohort']);
    }

    /**
     * Nonaktifkan mahasiswa: soft-delete profil + set akun user inactive.
     */
    public function deleteStudent(Student $student): void
    {
        DB::transaction(function () use ($student) {
            $student->user->update(['status' => 'inactive']);
            $student->delete();
        });
    }

    /**
     * Import massal dari baris spreadsheet (heading: nama, email, nim, password opsional).
     * Baris tidak valid dilewati dengan alasan — tidak menggagalkan seluruh import.
     *
     * @param  iterable<int, array<string, mixed>>  $rows
     * @return array{created:int, skipped:array<int, array{row:int, reason:string}>}
     */
    public function importRows(iterable $rows, string $programId, string $cohortId): array
    {
        $created = 0;
        $skipped = [];

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2; // +2: heading di baris 1, index mulai 0

            $name = trim((string) ($row['nama'] ?? $row['name'] ?? ''));
            $email = strtolower(trim((string) ($row['email'] ?? '')));
            $nim = trim((string) ($row['nim'] ?? $row['identity_number'] ?? ''));
            $password = trim((string) ($row['password'] ?? ''));

            if ($name === '' && $email === '' && $nim === '') {
                continue; // baris kosong
            }

            if ($name === '' || $email === '' || $nim === '') {
                $skipped[] = ['row' => $rowNumber, 'reason' => 'Kolom nama/email/nim wajib diisi'];

                continue;
            }
            if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $skipped[] = ['row' => $rowNumber, 'reason' => "Email tidak valid: {$email}"];

                continue;
            }
            if (User::where('email', $email)->exists()) {
                $skipped[] = ['row' => $rowNumber, 'reason' => "Email sudah terdaftar: {$email}"];

                continue;
            }
            if (User::where('identity_number', $nim)->exists()) {
                $skipped[] = ['row' => $rowNumber, 'reason' => "NIM sudah terdaftar: {$nim}"];

                continue;
            }

            $this->createStudent([
                'name' => $name,
                'email' => $email,
                'identity_number' => $nim,
                'password' => $password !== '' ? $password : null,
                'program_id' => $programId,
                'cohort_id' => $cohortId,
                'status' => 'active',
                'enrollment_date' => now()->toDateString(),
            ]);
            $created++;
        }

        return ['created' => $created, 'skipped' => $skipped];
    }
}
