"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, CheckCircle, Clock } from "lucide-react";
import api from "@/lib/api";

interface PreceptorStats {
  assigned_students: number;
  pending_logbooks: number;
  total_assessments: number;
}

export default function PreceptorDashboardPage() {
  const [stats, setStats] = useState<PreceptorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/clinical/preceptor/dashboard-stats");
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
              Mahasiswa aktif pada stase ini
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
            <CardTitle className="text-sm font-medium">Total Assessment</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_assessments || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ujian klinis diselesaikan
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-8">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Logbook Terbaru</CardTitle>
            <CardDescription>
              Menampilkan logbook yang baru-baru ini diunggah oleh mahasiswa bimbingan Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed">
              <FileText className="h-10 w-10 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Buka Modul Verifikasi</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-sm">
                Navigasi ke menu &quot;Verifikasi Logbook&quot; untuk melihat daftar lengkap dan memberikan umpan balik.
              </p>
              <a 
                href="/dashboard/preceptor/logbook-verification"
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
              >
                Lihat Menunggu Verifikasi
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
            <CardDescription>Jalan pintas untuk tugas harian</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <a href="/dashboard/preceptor/assessments" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full mr-4">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Lakukan Ujian Klinis</h4>
                <p className="text-xs text-muted-foreground">Mulai sesi DOPS / Mini-CEX</p>
              </div>
            </a>
            
            <a href="/dashboard/users/students" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full mr-4">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Daftar Mahasiswa</h4>
                <p className="text-xs text-muted-foreground">Lihat progres mahasiswa</p>
              </div>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
