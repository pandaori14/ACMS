"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  FileSpreadsheet, FileText, Download, MapPin, GraduationCap,
  BarChart2, ShieldAlert, ClipboardList, Building2, Search,
} from "lucide-react";

interface CohortOption { id: string; name?: string }
interface StudentOption { id: string; user?: { name?: string; identity_number?: string } | null }

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background";

/** Unduh blob generik + toast */
async function downloadBlob(url: string, params: Record<string, string | number | boolean | undefined>, filename: string) {
  toast.loading("Menyiapkan laporan...", { id: "report-dl" });
  try {
    const res = await api.get(url, { params, responseType: "blob" });
    const objectUrl = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = objectUrl;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
    toast.success("Laporan diunduh.", { id: "report-dl" });
  } catch {
    toast.error("Gagal mengunduh laporan (cek hak akses/parameter).", { id: "report-dl" });
  }
}

export default function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  const perms = user?.permissions || [];
  const isStudent = user?.roles?.includes("Mahasiswa");
  const has = (p: string) => perms.includes(p);

  // Param state per laporan
  const [attDate, setAttDate] = useState("");
  const [attFlagged, setAttFlagged] = useState(false);
  const [cohortId, setCohortId] = useState("");
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [evalMin, setEvalMin] = useState(3);
  const [billingPeriod, setBillingPeriod] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [studentId, setStudentId] = useState("");

  const canPickStudent = !isStudent && (has("verify-logbook") || has("manage-academic-master") || has("view-analytics"));

  useEffect(() => {
    if (has("manage-grades")) {
      api.get("/api/v1/academic/cohorts").then((res) => setCohorts(res.data.data || [])).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sekali saat mount
  }, []);

  // Cari mahasiswa (debounce) untuk rekap logbook
  useEffect(() => {
    if (!canPickStudent) return;
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/api/v1/academic/students", {
          params: { per_page: 8, ...(studentSearch ? { search: studentSearch } : {}) },
        });
        setStudentOptions(res.data.data || []);
      } catch {
        setStudentOptions([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [studentSearch, canPickStudent]);

  const canSeeAnything =
    has("view-attendance-recap") || has("manage-grades") || has("view-analytics") ||
    has("manage-incidents") || has("manage-finance") || has("view-logbook") || has("verify-logbook");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pusat Laporan</h1>
        <p className="text-muted-foreground mt-1">
          Semua unduhan laporan resmi dalam satu tempat — sesuai hak akses Anda.
        </p>
      </div>

      {!canSeeAnything && (
        <p className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-xl">
          Tidak ada laporan yang tersedia untuk peran Anda.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Rekap Presensi */}
        {has("view-attendance-recap") && (
          <Card className="clean-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-900" /> Rekap Presensi
              </CardTitle>
              <CardDescription>Excel — sesuai cakupan Anda (RS/bimbingan/semua)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Input type="date" className="h-9 w-40" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={attFlagged} onChange={(e) => setAttFlagged(e.target.checked)} />
                  Hanya yang ditandai
                </label>
              </div>
              <Button
                size="sm"
                onClick={() => downloadBlob("/api/v1/clinical/attendance/recap/export", {
                  date: attDate || undefined,
                  flagged_only: attFlagged || undefined,
                }, "Rekap_Presensi.xlsx")}
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Unduh Excel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Rekap Nilai Angkatan */}
        {has("manage-grades") && (
          <Card className="clean-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-900" /> Rekap Nilai Angkatan
              </CardTitle>
              <CardDescription>Excel — semua nilai stase satu angkatan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <select className={selectClass} value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
                <option value="">Pilih Angkatan</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!cohortId}
                  onClick={() => downloadBlob("/api/v1/grades/export-cohort", { cohort_id: cohortId }, "Rekap_Nilai_Angkatan.xlsx")}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-1" /> Unduh Excel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadBlob("/api/v1/grades/export", {}, "Export_SIAKAD.csv")}
                >
                  <Download className="w-4 h-4 mr-1" /> CSV SIAKAD
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Laporan Evaluasi */}
        {has("view-analytics") && (
          <Card className="clean-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-900" /> Laporan Evaluasi Klinis
              </CardTitle>
              <CardDescription>PDF — agregat anonim preceptor & RS</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                Ambang anonimitas
                <Input
                  type="number" className="h-9 w-20" min={1} max={10}
                  value={evalMin}
                  onChange={(e) => setEvalMin(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                />
                responden
              </div>
              <Button
                size="sm"
                onClick={() => downloadBlob("/api/v1/clinical/evaluations/report/export", { min_responses: evalMin }, "Laporan_Evaluasi.pdf")}
              >
                <FileText className="w-4 h-4 mr-1" /> Unduh PDF
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Statistik Insiden */}
        {has("manage-incidents") && (
          <Card className="clean-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-blue-900" /> Statistik Insiden
              </CardTitle>
              <CardDescription>PDF — status, jenis, keparahan, tren 30 hari</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                onClick={() => downloadBlob("/api/v1/incidents/statistics/export", {}, "Statistik_Insiden.pdf")}
              >
                <FileText className="w-4 h-4 mr-1" /> Unduh PDF
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Rekap Logbook */}
        {(isStudent || canPickStudent) && (
          <Card className="clean-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-900" /> Buku Rekap Logbook
              </CardTitle>
              <CardDescription>
                PDF — seluruh entri logbook {isStudent ? "Anda" : "satu mahasiswa"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {canPickStudent && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      className="pl-9 h-9"
                      placeholder="Cari mahasiswa (nama/NIM)..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {studentOptions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setStudentId(s.id)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          studentId === s.id
                            ? "bg-blue-900 text-white border-blue-900"
                            : "bg-white dark:bg-slate-900 hover:border-blue-500"
                        }`}
                      >
                        {s.user?.name} ({s.user?.identity_number})
                      </button>
                    ))}
                  </div>
                </>
              )}
              <Button
                size="sm"
                disabled={!isStudent && !studentId}
                onClick={() => downloadBlob("/api/v1/clinical/logbooks/export",
                  isStudent ? {} : { student_id: studentId }, "Rekap_Logbook.pdf")}
              >
                <FileText className="w-4 h-4 mr-1" /> Unduh PDF
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Keuangan */}
        {has("manage-finance") && (
          <Card className="clean-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-900" /> Tagihan Rumah Sakit
              </CardTitle>
              <CardDescription>Excel — daftar tagihan per periode</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                className="h-9 w-44"
                placeholder="Periode (mis. Q1-2026)"
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value)}
              />
              <Button
                size="sm"
                disabled={!billingPeriod}
                onClick={() => downloadBlob("/api/export/billings", { period: billingPeriod }, "Tagihan_RS.xlsx")}
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Unduh Excel
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
