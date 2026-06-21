import { CompetenciesClient } from "./CompetenciesClient";

export default function CompetenciesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Master Kompetensi (SKDI)</h1>
        <p className="text-muted-foreground mt-2">
          Kelola referensi daftar penyakit dan keterampilan klinis untuk rujukan Logbook.
        </p>
      </div>

      <CompetenciesClient />
    </div>
  );
}
