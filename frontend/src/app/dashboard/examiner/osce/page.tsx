"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { Exam } from "@/lib/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ExaminerOsceDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/examinations");
      // Filter for OSCE type only if needed, assuming the API returns exams the user is an assessor for
      const osceExams = res.data.data.filter((exam: Exam) => exam.type === "OSCE");
      setExams(osceExams);
    } catch (error) {
      toast.error("Gagal memuat daftar ujian OSCE.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ONGOING":
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" /> Sedang Berlangsung</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Selesai</Badge>;
      case "DRAFT":
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" /> Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">OSCE Examiner Dashboard</h1>
          <p className="text-slate-500 mt-1">Kelola dan lakukan penilaian station OSCE untuk mahasiswa klinis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-10 text-muted-foreground">Memuat data ujian...</div>
        ) : exams.length === 0 ? (
          <div className="col-span-full text-center py-10 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed">
            <ClipboardList className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-500">Belum ada ujian OSCE yang ditugaskan kepada Anda saat ini.</p>
          </div>
        ) : (
          exams.map((exam) => (
            <Card key={exam.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  {getStatusBadge(exam.status)}
                  <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    {new Date(exam.date).toLocaleDateString('id-ID')}
                  </span>
                </div>
                <CardTitle className="text-xl line-clamp-1">{exam.name}</CardTitle>
                <CardDescription className="line-clamp-2">{exam.description || "Ujian OSCE Klinis"}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-4 flex flex-col gap-4">
                <div className="flex justify-between text-sm border-t pt-4">
                  <span className="text-muted-foreground">Stase</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{exam.stase?.name || "-"}</span>
                </div>
                <Button 
                  className="w-full" 
                  disabled={exam.status === 'DRAFT'}
                  onClick={() => router.push(`/dashboard/examinations/${exam.id}/assess`)}
                >
                  Masuk ke Ujian
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
