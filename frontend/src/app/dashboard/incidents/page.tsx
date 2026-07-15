"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ShieldAlert, RefreshCw, Eye, UserX, AlertTriangle, Clock, Flame } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import type { IncidentReport, IncidentSeverity, IncidentStatus } from "@/types/incident";

const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-blue-500 text-white",
};

export default function IncidentsDashboard() {
  const t = useTranslations("incidentList");
  const tc = useTranslations("common");
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

  // Severity/tipe bisa dikonfigurasi via system_references → fallback ke nilai mentah bila tak ada key.
  const severityLabel = (severity: IncidentSeverity) =>
    t.has(`severity.${severity}`) ? t(`severity.${severity}`) : severity;
  const typeLabel = (type: string) =>
    t.has(`type.${type}`) ? t(`type.${type}`) : type.replace(/_/g, " ");

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case "submitted": return <Badge variant="destructive">{t("status.submitted")}</Badge>;
      case "investigating": return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">{t("status.investigating")}</Badge>;
      case "resolved": return <Badge className="bg-green-600 hover:bg-green-700 text-white">{t("status.resolved")}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: IncidentSeverity | null) => {
    if (!severity) return null;
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${SEVERITY_COLORS[severity]}`}>{severityLabel(severity)}</span>;
  };

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
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, typeFilter, dateFrom, dateTo, t]);

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
            {canManage ? t("titleManage") : t("titleMine")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {canManage ? t("subtitleManage") : t("subtitleMine")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchIncidents(); fetchStats(); }} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </Button>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="clean-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("statTotal")}</CardTitle>
              <ShieldAlert className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">{t("statTotalSub")}</p>
            </CardContent>
          </Card>
          <Card className="clean-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("statSubmitted")}</CardTitle>
              <Clock className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-red-600">{stats.submitted}</div>
              <p className="text-xs text-muted-foreground mt-1">{t("statSubmittedSub")}</p>
            </CardContent>
          </Card>
          <Card className="clean-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("statInvestigating")}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-amber-600">{stats.investigating}</div>
              <p className="text-xs text-muted-foreground mt-1">{t("statInvestigatingSub")}</p>
            </CardContent>
          </Card>
          <Card className="clean-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("statCritical")}</CardTitle>
              <Flame className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-red-700">{stats.critical}</div>
              <p className="text-xs text-muted-foreground mt-1">{t("statCriticalSub")}</p>
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
                <SelectValue placeholder={t("filterAllStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAllStatus")}</SelectItem>
                <SelectItem value="submitted">{t("status.submitted")}</SelectItem>
                <SelectItem value="investigating">{t("status.investigating")}</SelectItem>
                <SelectItem value="resolved">{t("status.resolved")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("filterAllType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAllType")}</SelectItem>
                <SelectItem value="student_safety">{t("type.student_safety")}</SelectItem>
                <SelectItem value="patient_safety">{t("type.patient_safety")}</SelectItem>
                <SelectItem value="k3">{t("type.k3")}</SelectItem>
                <SelectItem value="bullying">{t("type.bullying")}</SelectItem>
                <SelectItem value="ethical_violation">{t("type.ethical_violation")}</SelectItem>
                <SelectItem value="sexual_harassment">{t("type.sexual_harassment")}</SelectItem>
                <SelectItem value="other">{t("type.other")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v ?? "all")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("filterAllSeverity")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAllSeverity")}</SelectItem>
                <SelectItem value="critical">{t("severity.critical")}</SelectItem>
                <SelectItem value="high">{t("severity.high")}</SelectItem>
                <SelectItem value="medium">{t("severity.medium")}</SelectItem>
                <SelectItem value="low">{t("severity.low")}</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full"
              placeholder={t("filterDateFrom")}
              title={t("filterDateFrom")}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full"
              placeholder={t("filterDateTo")}
              title={t("filterDateTo")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-md border border-muted/50 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm text-left">
          <thead className="bg-muted/50 text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">{tc("date")}</th>
              <th className="px-4 py-3 whitespace-nowrap">{t("colType")}</th>
              <th className="px-4 py-3 whitespace-nowrap">{t("colReporter")}</th>
              <th className="px-4 py-3 whitespace-nowrap">{t("colLocation")}</th>
              <th className="px-4 py-3 whitespace-nowrap">{t("colSeverity")}</th>
              <th className="px-4 py-3 whitespace-nowrap">{tc("status")}</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">{tc("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{t("loadingData")}</td>
              </tr>
            ) : incidents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{t("empty")}</td>
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
                    {typeLabel(incident.incident_type)}
                  </td>
                  <td className="px-4 py-3">
                    {incident.is_anonymous ? (
                      <div className="flex items-center text-muted-foreground gap-1.5">
                        <UserX className="h-3.5 w-3.5" />
                        <span className="italic">{t("anonymous")}</span>
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
                      <Eye className="h-4 w-4 mr-1" /> {t("detail")}
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
          {t("ownOnlyNote")}
        </p>
      )}
    </div>
  );
}
