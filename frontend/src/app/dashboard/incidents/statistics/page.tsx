"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { ArrowLeft, RefreshCw, BarChart2, Download, ShieldAlert, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import type { IncidentStatistics } from "@/types/incident";

const SEVERITY_FILL: Record<string, string> = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
};

function humanizeType(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function IncidentStatisticsPage() {
  const t = useTranslations("incidentStatistics");
  const router = useRouter();
  const permissions = useAuthStore((s) => s.user?.permissions) ?? [];
  const canManage = permissions.includes("manage-incidents");

  const [stats, setStats] = useState<IncidentStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  // Status/severity dari backend; fallback ke nilai mentah bila key tak ada (severity konfigurabel).
  const statusLabel = useCallback(
    (status: string) => (t.has(`status.${status}`) ? t(`status.${status}`) : status),
    [t]
  );
  const severityLabel = useCallback(
    (severity: string) => (t.has(`severity.${severity}`) ? t(`severity.${severity}`) : severity),
    [t]
  );

  useEffect(() => {
    if (!canManage) router.replace("/dashboard/incidents");
  }, [canManage, router]);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/incidents/statistics");
      setStats(res.data.data);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (canManage) fetchStats();
  }, [fetchStats, canManage]);

  const exportCsv = () => {
    if (!stats) return;
    const rows: string[] = [t("csvHeader")];
    Object.entries(stats.by_status).forEach(([k, v]) => rows.push(`${t("csvCatStatus")},${statusLabel(k)},${v}`));
    Object.entries(stats.by_severity).forEach(([k, v]) => rows.push(`${t("csvCatSeverity")},${severityLabel(k)},${v}`));
    Object.entries(stats.by_type).forEach(([k, v]) => rows.push(`${t("csvCatType")},${humanizeType(k)},${v}`));
    rows.push(`${t("csvCatTotal")},${t("csvAllReports")},${stats.total}`);

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${t("csvFilename")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!canManage) return null;

  const byType = stats ? Object.entries(stats.by_type).map(([k, v]) => ({ name: humanizeType(k), value: v })) : [];
  const bySeverity = stats ? Object.entries(stats.by_severity).map(([k, v]) => ({ name: severityLabel(k), value: v, fill: SEVERITY_FILL[k] ?? "#94a3b8" })) : [];
  const trend = stats ? stats.trend_30_days.map((d) => ({ date: format(new Date(d.date), "dd MMM"), count: d.count })) : [];

  const statCards = [
    { label: t("cardTotal"), value: stats?.total ?? 0, icon: ShieldAlert, color: "text-slate-900 dark:text-slate-50" },
    { label: t("cardSubmitted"), value: stats?.by_status?.submitted ?? 0, icon: Clock, color: "text-red-600" },
    { label: t("cardInvestigating"), value: stats?.by_status?.investigating ?? 0, icon: AlertTriangle, color: "text-amber-600" },
    { label: t("cardResolved"), value: stats?.by_status?.resolved ?? 0, icon: CheckCircle2, color: "text-green-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit -ml-2" onClick={() => router.push("/dashboard/incidents")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> {t("backToList")}
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-red-700 dark:text-red-400 flex items-center gap-2">
              <BarChart2 className="h-8 w-8" />
              {t("title")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!stats}>
              <Download className="h-4 w-4 mr-2" /> {t("exportCsv")}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> {t("refresh")}
            </Button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <Card key={c.label} className="clean-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-semibold ${c.color}`}>{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">{t("loading")}</div>
      ) : (
        <>
          {/* Tren 30 hari */}
          <Card className="clean-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t("trendTitle")}</CardTitle>
              <CardDescription className="text-xs">{t("trendDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              {trend.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">{t("trendEmpty")}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="count" name={t("trendSeriesName")} stroke="#dc2626" strokeWidth={2} fill="url(#trendFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Per Jenis */}
            <Card className="clean-card">
              <CardHeader>
                <CardTitle className="text-base font-semibold">{t("byTypeTitle")}</CardTitle>
                <CardDescription className="text-xs">{t("byTypeDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {byType.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">{t("noData")}</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byType} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} contentStyle={{ borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                      <Bar dataKey="value" name={t("byTypeSeriesName")} fill="#0f172a" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Per Keparahan */}
            <Card className="clean-card">
              <CardHeader>
                <CardTitle className="text-base font-semibold">{t("bySeverityTitle")}</CardTitle>
                <CardDescription className="text-xs">{t("bySeverityDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {bySeverity.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">{t("noSeverityData")}</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={bySeverity} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                        {bySeverity.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
