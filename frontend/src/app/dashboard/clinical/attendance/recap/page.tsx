import { Metadata } from "next";
import RecapClient from "./RecapClient";

export const metadata: Metadata = {
  title: "Rekap Presensi | ACMS",
  description: "Rekap kehadiran mahasiswa dengan verifikasi geofence dan flag anomali GPS",
};

export default function AttendanceRecapPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Rekap Presensi</h1>
        <p className="text-muted-foreground">
          Rekapitulasi kehadiran mahasiswa beserta jarak GPS terhadap rumah sakit dan penandaan
          anomali (perpindahan lokasi tidak wajar / dugaan titip absen) untuk ditinjau.
        </p>
      </div>
      <RecapClient />
    </div>
  );
}
