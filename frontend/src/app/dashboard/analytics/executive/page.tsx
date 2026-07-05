"use client";

import { useState } from "react";
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

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const selectClass =
  "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

export default function ExecutiveAnalyticsPage() {
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

  const scorecards = data?.scorecards;

  const trendData = (data?.incident_trends || []).map((t) => ({
    month: t.month.slice(5) + "/" + t.month.slice(2, 4),
    total: t.total,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Eksekutif</h1>
          <p className="text-muted-foreground mt-1">
            KPI strategis pendidikan klinik — beban RS, insiden, kelulusan, kepatuhan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className={selectClass} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
            <option value="">Periode Berjalan</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select className={selectClass} value={hospitalId} onChange={(e) => setHospitalId(e.target.value)}>
            <option value="">Semua RS</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Segarkan">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : !data ? (
        <p className="text-center text-muted-foreground py-12">Gagal memuat data.</p>
      ) : (
        <>
          {/* Scorecards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Mahasiswa Aktif", value: scorecards?.active_students, icon: Users, color: "text-blue-600 border-l-blue-500" },
              { label: "Penempatan Aktif", value: scorecards?.active_assignments, icon: CalendarSync, color: "text-emerald-600 border-l-emerald-500" },
              { label: "Insiden 30 Hari", value: scorecards?.incidents_30d, icon: ShieldAlert, color: "text-red-600 border-l-red-500" },
              { label: "Logbook Terverifikasi", value: `${scorecards?.logbook_verified_percent ?? 0}%`, icon: ClipboardCheck, color: "text-amber-600 border-l-amber-500" },
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
                  <Building2 className="w-4 h-4" /> Beban Rumah Sakit
                </CardTitle>
                <CardDescription>Mahasiswa aktif vs kuota per RS</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {data.hospital_load.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center pt-16">Belum ada data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.hospital_load} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="hospital" fontSize={11} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis fontSize={11} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="students" name="Mahasiswa" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="capacity" name="Kuota" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Pilar 3: Kelulusan Ujian */}
            <Card className="clean-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tingkat Kelulusan Ujian</CardTitle>
                <CardDescription>Per tipe ujian (dari nilai akhir peserta)</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {data.exam_pass_rate.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center pt-16">Belum ada hasil ujian.</p>
                ) : (
                  <div className="flex h-full items-center">
                    <ResponsiveContainer width="60%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.exam_pass_rate.flatMap((r) => [
                            { name: `${r.type} Lulus`, value: r.passed },
                            { name: `${r.type} Gagal`, value: r.failed },
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
                            {r.passed}/{r.total} lulus ({r.pass_rate}%)
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
              <CardTitle className="text-base">Tren Insiden Klinis (12 Bulan)</CardTitle>
              <CardDescription>Jumlah laporan insiden per bulan</CardDescription>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="total" name="Insiden" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pilar 4: Kepatuhan Logbook */}
          <Card className="clean-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Kepatuhan Logbook per Stase</CardTitle>
              <CardDescription>% entri terverifikasi dari total entri</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.logbook_compliance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada entri logbook.</p>
              ) : (
                data.logbook_compliance.map((row, i) => (
                  <div key={row.stase} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{row.stase}</span>
                      <span className="text-muted-foreground text-xs">
                        {row.verified}/{row.total} ({row.compliance_percent}%)
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

          <p className="text-xs text-muted-foreground text-right">
            Data dihitung {new Date(data.generated_at).toLocaleString("id-ID")} (cache 10 menit)
          </p>
        </>
      )}
    </div>
  );
}
