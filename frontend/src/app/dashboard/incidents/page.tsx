"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ShieldAlert, RefreshCw, Eye, UserX, AlertTriangle, Clock, CheckCircle2, Flame } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import type { IncidentReport, IncidentSeverity, IncidentStatus } from "@/types/incident";
import { STATUS_LABELS, SEVERITY_LABELS } from "@/types/incident";

const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-blue-500 text-white",
};

function getStatusBadge(status: IncidentStatus) {
  switch (status) {
    case "submitted": return <Badge variant="destructive">{STATUS_LABELS.submitted}</Badge>;
    case "investigating": return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">{STATUS_LABELS.investigating}</Badge>;
    case "resolved": return <Badge className="bg-green-600 hover:bg-green-700 text-white">{STATUS_LABELS.resolved}</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function getSeverityBadge(severity: IncidentSeverity | null) {
  if (!severity) return null;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${SEVERITY_COLORS[severity]}`}>{SEVERITY_LABELS[severity]}</span>;
}

export default function IncidentsDashboard() {
  const router = useRouter();
  const permissions = useAuthStore((s) => s.user?.permissions) ?? [];
  const canManage = permissions.includes("manage-incidents");

  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ total: number; submitted: number; investigating: number; critical: number } | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (severityFilter !== "all") params.severity = severityFilter;
      if (typeFilter !== "all") params.incident_type = typeFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get("/api/v1/incidents", { params });
      const data: IncidentReport[] = res.data.data;
      setIncidents(data);
    } catch {
      toast.error("Gagal memuat daftar insiden");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, typeFilter, dateFrom, dateTo]);

  // Statistik akurat dari endpoint (sudah di-scope server: manager = semua, pelapor = miliknya).
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/incidents/statistics");
      const s = res.data.data as {
        total: number;
        by_status: Record<string, number>;
        by_severity: Record<string, number>;
      };
      setStats({
        total: s.total ?? 0,
        submitted: s.by_status?.submitted ?? 0,
        investigating: s.by_status?.investigating ?? 0,
        critical: s.by_severity?.critical ?? 0,
      });
    } catch {
      // diamkan; kartu statistik opsional
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-red-700 dark:text-red-400 flex items-center gap-2">
            <ShieldAlert className="h-8 w-8" />
            {canManage ? "Daftar Laporan Insiden" : "Laporan Saya"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {canManage
              ? "Kelola dan tindak lanjuti laporan keamanan, K3, dan perundungan."
              : "Pantau status laporan insiden yang Anda kirimkan."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchIncidents(); fetchStats(); }} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="clean-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Laporan</CardTitle>
              <ShieldAlert className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">Semua status</p>
            </CardContent>
          </Card>
          <Card className="clean-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Laporan Masuk</CardTitle>
              <Clock className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-red-600">{stats.submitted}</div>
              <p className="text-xs text-muted-foreground mt-1">Belum diproses</p>
            </CardContent>
          </Card>
          <Card className="clean-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Investigasi</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-amber-600">{stats.investigating}</div>
              <p className="text-xs text-muted-foreground mt-1">Sedang ditangani</p>
            </CardContent>
          </Card>
          <Card className="clean-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Kritis</CardTitle>
              <Flame className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-red-700">{stats.critical}</div>
              <p className="text-xs text-muted-foreground mt-1">Severity critical</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="submitted">Laporan Masuk</SelectItem>
                <SelectItem value="investigating">Investigasi</SelectItem>
                <SelectItem value="resolved">Selesai</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="student_safety">Student Safety</SelectItem>
                <SelectItem value="patient_safety">Patient Safety</SelectItem>
                <SelectItem value="k3">K3</SelectItem>
                <SelectItem value="bullying">Bullying</SelectItem>
                <SelectItem value="ethical_violation">Pelanggaran Etik</SelectItem>
                <SelectItem value="sexual_harassment">Kekerasan Seksual</SelectItem>
                <SelectItem value="other">Lainnya</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v ?? "all")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Semua Tingkat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tingkat</SelectItem>
                <SelectItem value="critical">Kritis</SelectItem>
                <SelectItem value="high">Tinggi</SelectItem>
                <SelectItem value="medium">Sedang</SelectItem>
                <SelectItem value="low">Rendah</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full"
              placeholder="Dari tanggal"
              title="Dari tanggal"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full"
              placeholder="Sampai tanggal"
              title="Sampai tanggal"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-md border border-muted/50 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm text-left">
          <thead className="bg-muted/50 text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Tanggal</th>
              <th className="px-4 py-3 whitespace-nowrap">Tipe</th>
              <th className="px-4 py-3 whitespace-nowrap">Pelapor</th>
              <th className="px-4 py-3 whitespace-nowrap">Lokasi</th>
              <th className="px-4 py-3 whitespace-nowrap">Tingkat</th>
              <th className="px-4 py-3 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Memuat data...</td>
              </tr>
            ) : incidents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Tidak ada laporan insiden ditemukan.</td>
              </tr>
            ) : (
              incidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {format(new Date(incident.incident_date), "dd MMM yyyy")}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(incident.created_at), "dd/MM/yy HH:mm")}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium capitalize">
                    {incident.incident_type.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3">
                    {incident.is_anonymous ? (
                      <div className="flex items-center text-muted-foreground gap-1.5">
                        <UserX className="h-3.5 w-3.5" />
                        <span className="italic">Anonim</span>
                      </div>
                    ) : (
                      incident.reporter?.name ?? "—"
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[180px] truncate">{incident.location}</td>
                  <td className="px-4 py-3">{getSeverityBadge(incident.severity)}</td>
                  <td className="px-4 py-3">{getStatusBadge(incident.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/incidents/${incident.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" /> Detail
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!canManage && (
        <p className="text-xs text-muted-foreground text-center">
          Anda hanya dapat melihat laporan yang Anda buat sendiri.
        </p>
      )}
    </div>
  );
}
