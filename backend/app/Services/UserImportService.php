<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Import massal pengguna dari baris spreadsheet (heading: nama, email,
 * password?, nim?). Semua baris diberi role yang dipilih di dialog.
 * Baris tidak valid dilewati dengan alasan — tidak menggagalkan batch.
 */
class UserImportService
{
    /**
     * @param  iterable<int, array<string, mixed>>  $rows
     * @return array{created:int, skipped:array<int, array{row:int, reason:string}>}
     */
    public function importRows(iterable $rows, string $roleName): array
    {
        $created = 0;
        $skipped = [];

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2; // heading di baris 1

            $name = trim((string) ($row['nama'] ?? $row['name'] ?? ''));
            $email = strtolower(trim((string) ($row['email'] ?? '')));
            $password = trim((string) ($row['password'] ?? ''));
            $nim = trim((string) ($row['nim'] ?? $row['identity_number'] ?? ''));

            if ($name === '' && $email === '') {
                continue; // baris kosong
            }
            if ($name === '' || $email === '') {
                $skipped[] = ['row' => $rowNumber, 'reason' => 'Kolom nama/email wajib diisi'];

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
            if ($nim !== '' && User::where('identity_number', $nim)->exists()) {
                $skipped[] = ['row' => $rowNumber, 'reason' => "NIM/NIP sudah terdaftar: {$nim}"];

                continue;
            }

            $plainPassword = $password !== ''
                ? $password
                : Str::password(12, letters: true, numbers: true, symbols: false);

            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($plainPassword),
                'identity_number' => $nim !== '' ? $nim : null,
                'status' => 'active',
            ]);
            $user->syncRoles([$roleName]);

            NotificationService::sendDynamicEmail(
                $email,
                'Selamat Datang di ACMS',
                'email_template_welcome',
                'new_account',
                [
                    'name' => $name,
                    'email' => $email,
                    'password' => $plainPassword,
                    'link' => url('/login'),
                ]
            );

            $created++;
        }

        return ['created' => $created, 'skipped' => $skipped];
    }
}
