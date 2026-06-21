import { SettingsClient } from "./SettingsClient";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan Sistem</h1>
        <p className="text-muted-foreground mt-2">
          Konfigurasi global terkait tahun akademik dan aturan aplikasi.
        </p>
      </div>

      <SettingsClient />
    </div>
  );
}
