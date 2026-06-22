"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

export default function AnalyticsPage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  
  interface ChartDatum {
    value?: number;
    fill?: string;
    name?: string;
    [key: string]: unknown;
  }
  interface AnalyticsData {
    grade_distribution?: ChartDatum[];
    logbook_completion?: ChartDatum[];
    stase_performance?: ChartDatum[];
  }
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Analytics is only for Admins/Kaprodi/Super Admin
    if (user && !["Super Admin", "Admin Prodi", "Kaprodi"].includes(user.roles?.[0] || "")) {
      router.push("/dashboard");
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const res = await api.get("/api/analytics");
        setData(res.data);
      } catch (err) {
        console.error("Failed to load analytics", err);
        setError(getApiErrorMessage(err, "Gagal memuat data analitik."));
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [user, router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Analytics & Reports</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl md:col-span-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">Akses Ditolak</h2>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Analytics & Reports
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Wawasan mendalam mengenai tren kelulusan, performa stase, dan logbook mahasiswa.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRADE DISTRIBUTION CHART */}
        <Card className="clean-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Distribusi Kelulusan (Huruf Mutu)</CardTitle>
            <CardDescription className="text-xs">Komparasi jumlah mahasiswa berdasarkan nilai akhir</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {data?.grade_distribution?.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-500 text-sm">Tidak ada data kelulusan</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.grade_distribution} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis 
                    dataKey="grade" 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }}
                    contentStyle={{ 
                      borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', backgroundColor: '#ffffff', fontSize: '12px', color: '#0f172a'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#0f172a" 
                    radius={[4, 4, 0, 0]}
                    name="Jumlah Mahasiswa"
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* LOGBOOK COMPLETION PIE CHART */}
        <Card className="clean-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Tingkat Kepatuhan Logbook</CardTitle>
            <CardDescription className="text-xs">Status penyelesaian buku log klinis secara global</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             {data?.logbook_completion?.every((i) => i.value === 0) ? (
              <div className="flex h-full items-center justify-center text-slate-500 text-sm">Tidak ada data logbook</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.logbook_completion}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={1000}
                  >
                    {data?.logbook_completion?.map((entry, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* STASE PERFORMANCE LINE CHART */}
        <Card className="clean-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Performa Rata-rata per Stase</CardTitle>
            <CardDescription className="text-xs">Tren akumulasi skor penilaian dari seluruh mahasiswa per departemen</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {data?.stase_performance?.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-500 text-sm">Tidak ada data performa stase</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.stase_performance} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis 
                    dataKey="stase_name" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{ 
                      borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', backgroundColor: '#ffffff', fontSize: '12px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="average_score" 
                    stroke="#0f172a" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#0f172a', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                    name="Rata-rata Skor"
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
