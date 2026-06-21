import { Metadata } from "next";
import AuditLogsClient from "./AuditLogsClient";

export const metadata: Metadata = {
  title: "Audit Trail | ACMS",
  description: "Jejak audit immutable seluruh aktivitas penting sistem ACMS",
};

export default function AuditLogsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
        <p className="text-muted-foreground">
          Catatan immutable (append-only) dengan rantai hash anti-manipulasi untuk setiap aksi
          penting: perubahan nilai, verifikasi logbook, penugasan rotasi, dan operasi keuangan.
          Super Admin melihat seluruh program; Kaprodi hanya programnya sendiri.
        </p>
      </div>
      <AuditLogsClient />
    </div>
  );
}
