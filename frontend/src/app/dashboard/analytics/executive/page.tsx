"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, CalendarSync, ShieldAlert, ClipboardCheck, RefreshCw, Building2,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";

interface HospitalLoadRow {
  hospital: string;
  students: number;
  capacity: number | null;
  utilization_percent: number | null;
}

interface IncidentTrendRow {
  month: string;
  total: number;
  by_type: Record<string, number>;
}

interface PassRateRow {
  type: string;
  total: number;
  passed: number;
  failed: number;
  pass_rate: number;
}

interface ComplianceRow {
  stase: string;
  total: number;
  verified: number;
  compliance_percent: number;
}

interface ExecutiveData {
  scorecards: {
    active_students: number;
    active_assignments: number;
    incidents_30d: number;
    logbook_verified_percent: number;
  };
  hospital_load: HospitalLoadRow[];
  incident_trends: IncidentTrendRow[];
  exam_pass_rate: PassRateRow[];
  logbook_compliance: ComplianceRow[];
  generated_at: string;
}

interface PeriodOption { id: string; name?: string }
interface HospitalOption { id: string; name?: string }

interface AtRiskStudent {
  student_id: string;
  user_id: string;
  name?: string | null;
  identity_number?: string | null;
  level: "high" | "medium" | "low";
  signals: string[];
}

interface AtRiskData {
  scanned: number;
  students: AtRiskStudent[];
}

interface CohortComparisonRow {
  cohort: string;
  students: number;
  graduated_pct: number;
  avg_grade: number | null;
  ukmppd_first_take_pass_pct: number | null;
}

const RISK_BADGE: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const selectClass =
  "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

export default function ExecutiveAnalyticsPage() {
  const t = useTranslations("analyticsExecutive");
  const [periodId, setPeriodId] = useState("");
  const [hospitalId, setHospitalId] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["executive-analytics", periodId, hospitalId],
    queryFn: async (): Promise<ExecutiveData> => {
      const res = await api.get("/api/v1/analytics/executive", {
        params: {
          ...(periodId ? { rotation_period_id: periodId } : {}),
          ...(hospitalId ? { hospital_id: hospitalId } : {}),
        },
      });
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: periods = [] } = useQuery({
    queryKey: ["exec-periods"],
    queryFn: async (): Promise<PeriodOption[]> =>
      (await api.get("/api/v1/rotation/periods")).data.data || [],
    staleTime: 10 * 60 * 1000,
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ["exec-hospitals"],
    queryFn: async (): Promise<HospitalOption[]> =>
      (await api.get("/api/v1/rotation/hospitals")).data.data || [],
    staleTime: 10 * 60 * 1000,
  });

  const { data: atRisk } = useQuery({
    queryKey: ["analytics-at-risk"],
    queryFn: async (): Promise<AtRiskData> =>
      (await api.get("/api/v1/analytics/at-risk")).data.data,
    staleTime: 5 * 60 * 1000,
  });

  const { data: cohortComparison = [] } = useQuery({
    queryKey: ["analytics-cohort-comparison"],
    queryFn: async (): Promise<CohortComparisonRow[]> =>
      (await api.get("/api/v1/analytics/cohort-comparison")).data.data || [],
    staleTime: 5 * 60 * 1000,
  });

  const scorecards = data?.scorecards;

  const trendData = (data?.incident_trends || []).map((row) => ({
    month: row.month.slice(5) + "/" + row.month.slice(2, 4),
    total: row.total,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className={selectClass} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
            <option value="">{t("currentPeriod")}</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select className={selectClass} value={hospitalId} onChange={(e) => setHospitalId(e.target.value)}>
            <option value="">{t("allHospitals")}</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <Button variant="outline" size="icon" onClick={() => refetch()} aria-label={t("refresh")}>
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : !data ? (
        <p className="text-center text-muted-foreground py-12">{t("loadFailed")}</p>
      ) : (
        <>
          {/* Scorecards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[
              { label: t("activeStudents"), value: scorecards?.active_students, icon: Users, color: "text-blue-600 border-l-blue-500" },
              { label: t("activeAssignments"), value: scorecards?.active_assignments, icon: CalendarSync, color: "text-emerald-600 border-l-emerald-500" },
              { label: t("incidents30d"), value: scorecards?.incidents_30d, icon: ShieldAlert, color: "text-red-600 border-l-red-500" },
              { label: t("logbookVerified"), value: `${scorecards?.logbook_verified_percent ?? 0}%`, icon: ClipboardCheck, color: "text-amber-600 border-l-amber-500" },
            ].map((card) => (
              <Card key={card.label} className={`border-l-4 ${card.color.split(" ")[1]}`}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                      <p className="text-2xl font-bold mt-1">{card.value ?? 0}</p>
                    </div>
                    <card.icon className={`w-8 h-8 opacity-70 ${card.color.split(" ")[0]}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Pilar 1: Beban RS */}
            <Card className="clean-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> {t("hospitalLoadTitle")}
                </CardTitle>
                <CardDescription>{t("hospitalLoadDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {data.hospital_load.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center pt-16">{t("noData")}</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.hospital_load} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="hospital" fontSize={11} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis fontSize={11} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="students" name={t("students")} fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="capacity" name={t("capacity")} fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Pilar 3: Kelulusan Ujian */}
            <Card className="clean-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("examPassTitle")}</CardTitle>
                <CardDescription>{t("examPassDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {data.exam_pass_rate.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center pt-16">{t("noExamData")}</p>
                ) : (
                  <div className="flex h-full items-center">
                    <ResponsiveContainer width="60%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.exam_pass_rate.flatMap((r) => [
                            { name: t("passLabel", { type: r.type }), value: r.passed },
                            { name: t("failLabel", { type: r.type }), value: r.failed },
                          ]).filter((d) => d.value > 0)}
                          dataKey="value"
                          innerRadius={45}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {data.exam_pass_rate.flatMap((r) => [
                            { key: `${r.type}-p`, color: "var(--chart-2)" },
                            { key: `${r.type}-f`, color: "var(--chart-5)" },
                          ]).map((c, i) => (
                            <Cell key={c.key + i} fill={c.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 text-sm">
                      {data.exam_pass_rate.map((r) => (
                        <div key={r.type}>
                          <p className="font-semibold">{r.type}</p>
                          <p className="text-muted-foreground text-xs">
                            {t("passedSummary", { passed: r.passed, total: r.total, rate: r.pass_rate })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pilar 2: Tren Insiden */}
          <Card className="clean-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("incidentTrendTitle")}</CardTitle>
              <CardDescription>{t("incidentTrendDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="total" name={t("incidents")} stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pilar 4: Kepatuhan Logbook */}
          <Card className="clean-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("logbookComplianceTitle")}</CardTitle>
              <CardDescription>{t("logbookComplianceDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.logbook_compliance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t("noLogbookEntries")}</p>
              ) : (
                data.logbook_compliance.map((row, i) => (
                  <div key={row.stase} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{row.stase}</span>
                      <span className="text-muted-foreground text-xs">
                        {t("complianceSummary", { verified: row.verified, total: row.total, percent: row.compliance_percent })}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${row.compliance_percent}%`,
                          background: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Early warning: mahasiswa berisiko */}
          <Card className="clean-card border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("atRiskTitle")}</CardTitle>
              <CardDescription>
                {t("atRiskDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!atRisk || atRisk.students.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t("noAtRisk")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="text-left text-xs uppercase text-slate-400 border-b">
                        <th className="py-2 pr-3">{t("student")}</th>
                        <th className="py-2 pr-3">{t("level")}</th>
                        <th className="py-2">{t("signals")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atRisk.students.slice(0, 15).map((s) => (
                        <tr key={s.student_id} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="py-2 pr-3 whitespace-nowrap">
                            <span className="font-medium">{s.name}</span>
                            <span className="block text-xs text-slate-400">{s.identity_number}</span>
                          </td>
                          <td className="py-2 pr-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RISK_BADGE[s.level]}`}>
                              {s.level === "high" ? t("levelHigh") : s.level === "medium" ? t("levelMedium") : t("levelLow")}
                            </span>
                          </td>
                          <td className="py-2 text-slate-600 dark:text-slate-300">{s.signals.join(" · ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {atRisk.students.length > 15 && (
                    <p className="text-xs text-slate-400 mt-2">
                      {t("moreStudents", { count: atRisk.students.length - 15 })}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Perbandingan antar-angkatan */}
          <Card className="clean-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("cohortTitle")}</CardTitle>
              <CardDescription>
                {t("cohortDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cohortComparison.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("noCohortData")}</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={cohortComparison} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="cohort" fontSize={12} />
                    <YAxis fontSize={12} domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="avg_grade" name={t("avgGrade")} fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="graduated_pct" name={t("graduatedPct")} fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ukmppd_first_take_pass_pct" name={t("ukmppdPct")} fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-right">
            {t("generatedAt", { date: new Date(data.generated_at).toLocaleString("id-ID") })}
          </p>
        </>
      )}
    </div>
  );
}
