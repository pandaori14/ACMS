<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use App\Models\UserNotificationPreference;
use App\Notifications\BroadcastAnnouncement;
use App\Services\NotificationService;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * P5: broadcast massal (RBAC send-broadcasts, target role, riwayat) dan
 * preferensi notifikasi email per user (opt-out dihormati NotificationService,
 * event kritis tidak bisa dimatikan).
 */
class BroadcastPreferenceTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminProdi;

    protected User $studentUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(SettingSeeder::class);

        $this->adminProdi = User::factory()->create(['status' => 'active']);
        $this->adminProdi->assignRole('Admin Prodi');

        $this->studentUser = User::factory()->create(['status' => 'active']);
        $this->studentUser->assignRole('Mahasiswa');
    }

    public function test_broadcast_requires_permission_and_sends_to_role(): void
    {
        Notification::fake();

        $this->actingAs($this->studentUser)->postJson('/api/v1/broadcasts', [
            'subject' => 'Halo', 'body' => 'Pesan percobaan dari mahasiswa.', 'target_type' => 'all',
        ])->assertForbidden();

        $res = $this->actingAs($this->adminProdi)->postJson('/api/v1/broadcasts', [
            'subject' => 'Pengumuman Yudisium',
            'body' => 'Sidang yudisium periode Juli dilaksanakan tanggal 25 Juli.',
            'target_type' => 'role',
            'target_id' => 'Mahasiswa',
        ]);

        $res->assertCreated()->assertJsonPath('data.recipients_count', 1);
        Notification::assertSentTo($this->studentUser, BroadcastAnnouncement::class);

        // Riwayat tercatat
        $list = $this->actingAs($this->adminProdi)->getJson('/api/v1/broadcasts');
        $list->assertOk();
        $this->assertCount(1, $list->json('data'));
    }

    public function test_broadcast_empty_target_rejected(): void
    {
        Notification::fake();

        $this->actingAs($this->adminProdi)->postJson('/api/v1/broadcasts', [
            'subject' => 'Uji', 'body' => 'Target peran tanpa anggota harus ditolak.',
            'target_type' => 'role', 'target_id' => 'Keuangan',
        ])->assertUnprocessable();
    }

    public function test_user_can_toggle_preferences_and_optout_respected(): void
    {
        Mail::fake();

        // Daftar preferensi tersedia + default aktif
        $res = $this->actingAs($this->studentUser)->getJson('/api/v1/notification-preferences');
        $res->assertOk();
        $events = collect($res->json('data'));
        $this->assertTrue($events->firstWhere('event_type', 'grade_published')['email_enabled']);
        // Event kritis tidak muncul di daftar
        $this->assertNull($events->firstWhere('event_type', 'reset_password'));

        // Matikan grade_published
        $this->actingAs($this->studentUser)->putJson('/api/v1/notification-preferences', [
            'preferences' => [
                ['event_type' => 'grade_published', 'email_enabled' => false],
                ['event_type' => 'reset_password', 'email_enabled' => false], // diabaikan (kritis)
            ],
        ])->assertOk();

        $this->assertDatabaseHas('user_notification_preferences', [
            'user_id' => $this->studentUser->id,
            'event_type' => 'grade_published',
            'email_enabled' => false,
        ]);
        $this->assertDatabaseMissing('user_notification_preferences', [
            'event_type' => 'reset_password',
        ]);

        // Aktifkan matrix grade_published agar jalur kirim tercapai
        $setting = Setting::where('key', 'smtp_notification_matrix')->first();
        $matrix = json_decode($setting->value, true);
        $matrix['grade_published']['enabled'] = true;
        $setting->update(['value' => json_encode($matrix)]);
        Setting::clearCache();

        // Opt-out dihormati: tidak ada email terkirim ke mahasiswa
        $sent = NotificationService::sendDynamicEmail(
            $this->studentUser->email,
            'Nilai Terbit',
            'email_template_grade_published',
            'grade_published',
            ['name' => $this->studentUser->name, 'stase' => 'IPD', 'grade' => 'A', 'score' => '85']
        );

        $this->assertFalse($sent); // primary dilepas & tidak ada cc/bcc fallback
        Mail::assertNothingQueued();
    }

    public function test_optout_does_not_silence_admin_bcc_roles(): void
    {
        Mail::fake();

        // appeal_submitted: notify_roles Kaprodi — walau pemohon opt-out,
        // Kaprodi tetap menerima (fallback primary → bcc pertama).
        $kaprodi = User::factory()->create(['status' => 'active']);
        $kaprodi->assignRole('Kaprodi');

        UserNotificationPreference::create([
            'user_id' => $this->studentUser->id,
            'event_type' => 'appeal_submitted',
            'email_enabled' => false,
        ]);

        $sent = NotificationService::sendDynamicEmail(
            $this->studentUser->email,
            'Banding Diajukan',
            'email_template_appeal_submitted',
            'appeal_submitted',
            ['name' => $this->studentUser->name, 'stase' => 'IPD', 'reason' => 'Uji preferensi.']
        );

        $this->assertTrue($sent);
    }
}
