import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import RecapClient from "./RecapClient";

export const metadata: Metadata = {
  title: "Rekap Presensi | ACMS",
  description: "Rekap kehadiran mahasiswa dengan verifikasi geofence dan flag anomali GPS",
};

export default async function AttendanceRecapPage() {
  const t = await getTranslations("clinicalAttendanceRecap");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>
      <RecapClient />
    </div>
  );
}
