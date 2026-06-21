import { Metadata } from "next";
import ReferencesClient from "./ReferencesClient";

export const metadata: Metadata = {
  title: "Master Data Referensi | ACMS",
  description: "Kelola referensi data sistem untuk seluruh modul ACMS",
};

export default function SettingsReferencesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Master Data & Referensi Sistem</h1>
        <p className="text-muted-foreground">
          Konfigurasi semua nilai dropdown dan data master yang digunakan oleh berbagai modul dalam ACMS.
        </p>
      </div>
      <ReferencesClient />
    </div>
  );
}
