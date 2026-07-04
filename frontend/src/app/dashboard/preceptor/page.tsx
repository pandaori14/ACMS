"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, CheckCircle, Clock, Wallet } from "lucide-react";
import api from "@/lib/api";

interface ActiveStudentRow {
  id: string;
  status?: string;
  student?: { user?: { name?: string; identity_number?: string } | null } | null;
  stase?: { name?: string } | null;
  hospital?: { name?: string } | null;
}

interface PreceptorStats {
  assigned_students: number;
  pending_logbooks: number;
  total_assessments: number;
  active_students?: ActiveStudentRow[];
}

export default function PreceptorDashboardPage() {
  const [stats, setStats] = useState<PreceptorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/api/v1/clinical/preceptor/dashboard-stats");
        setStats(response.data.data);
      } catch (error) {
        console.error("Failed to fetch preceptor stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeStudents = stats?.active_students || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dasbor Preceptor</h1>
        <p className="text-muted-foreground mt-2">
          Pantau mahasiswa bimbingan, verifikasi logbook, dan lakukan penilaian klinis.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Mahasiswa Bimbingan</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.assigned_students || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total mahasiswa yang pernah/masih dibimbing
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Menunggu Verifikasi</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_logbooks || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Logbook perlu ditinjau
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Penilaian</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_assessments || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Mini-CEX / DOPS / CBD yang telah diisi
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-8">
        <Card className="col-span-full lg:col-span-4">
          <CardHeader>
            <CardTitle>Mahasiswa Bimbingan Aktif</CardTitle>
            <CardDescription>
              Mahasiswa pada periode rotasi yang sedang berjalan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed">
                <Users className="h-10 w-10 text-gray-400 mb-3" />
                <p className="text-sm text-gray-500 max-w-sm">
                  Belum ada mahasiswa yang ditugaskan kepada Anda pada periode berjalan.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeStudents.map((row) => (
                  <div key={row.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{row.student?.user?.name || "-"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {row.student?.user?.identity_number || ""} — {row.stase?.name || "-"} @ {row.hospital?.name || "-"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {(row.status || "").replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-full lg:col-span-3">
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
            <CardDescription>Jalan pintas untuk tugas harian</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/dashboard/clinical/verification" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full mr-4">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Verifikasi Logbook</h4>
                <p className="text-xs text-muted-foreground">
                  {stats?.pending_logbooks || 0} logbook menunggu tinjauan
                </p>
              </div>
            </Link>

            <Link href="/dashboard/assessments/create" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full mr-4">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Isi Penilaian Klinis</h4>
                <p className="text-xs text-muted-foreground">Mulai sesi Mini-CEX / DOPS / CBD</p>
              </div>
            </Link>

            <Link href="/dashboard/finance/preceptors" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full mr-4">
                <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Honorarium Saya</h4>
                <p className="text-xs text-muted-foreground">Riwayat insentif bimbingan & ujian</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
