"use client";

import { useAuthStore } from "@/store/useAuthStore";
import IncidentReportForm from "@/components/incidents/IncidentReportForm";
import IncidentConfigurator from "@/components/incidents/IncidentConfigurator";

/**
 * Halaman role-aware untuk menu "Lapor Insiden".
 * - Punya `configure-incident-form` (Super Admin, Admin Prodi) → Konfigurator + Preview.
 * - Selain itu (pelapor biasa) → Form Lapor Insiden.
 */
export default function IncidentReportPage() {
  const permissions = useAuthStore((s) => s.user?.permissions) ?? [];
  const canConfigure = permissions.includes("configure-incident-form");

  return canConfigure ? <IncidentConfigurator /> : <IncidentReportForm />;
}
