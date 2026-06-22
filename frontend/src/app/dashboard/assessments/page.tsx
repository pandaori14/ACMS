"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { RubricSchema } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

interface AssessmentScore {
  id: string;
  rubric_key: string;
  score: string;
}

interface Assessment {
  id: string;
  assessment_date: string;
  total_score: string;
  feedback_notes: string;
  status: "draft" | "submitted" | "acknowledged";
  template: { name: string; type: string; rubric_schema?: RubricSchema };
  student: { name: string };
  preceptor: { name: string };
  scores: AssessmentScore[];
}

export default function AssessmentHistoryPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  
  const user = useAuthStore((state) => state.user);
  const isStudent = user?.roles?.includes("Mahasiswa");

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/assessments");
      setAssessments(res.data.data || res.data); // Support both paginated and non-paginated arrays
    } catch (err) {
      console.error("Failed to load assessments", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleAcknowledge = async (id: string) => {
    setAcknowledging(true);
    try {
      await api.patch(`/api/v1/assessments/${id}/acknowledge`);
      setIsDialogOpen(false);
      fetchAssessments();
    } catch (err) {
      console.error("Acknowledge failed", err);
    } finally {
      setAcknowledging(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">Draf</span>;
      case "submitted":
        return <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Menunggu Persetujuan</span>;
      case "acknowledged":
        return <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Disetujui</span>;
      default:
        return <span>{status}</span>;
    }
  };

  const viewDetails = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Riwayat Penilaian</h1>
          <p className="text-muted-foreground mt-1">
            Lihat hasil evaluasi Mini-CEX, DOPS, dan CBD Anda.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jenis Instrumen</TableHead>
              {!isStudent && <TableHead>Mahasiswa</TableHead>}
              {isStudent && <TableHead>Dodiknis / Penilai</TableHead>}
              <TableHead>Total Nilai</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : assessments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <BookOpen className="mx-auto h-10 w-10 text-muted-foreground mb-3 opacity-20" />
                  <p className="text-muted-foreground">Belum ada riwayat penilaian.</p>
                </TableCell>
              </TableRow>
            ) : (
              assessments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{new Date(a.assessment_date).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell className="font-medium text-blue-600">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {a.template?.name || "Instrumen"}
                    </div>
                  </TableCell>
                  {!isStudent && <TableCell>{a.student?.name}</TableCell>}
                  {isStudent && <TableCell>{a.preceptor?.name}</TableCell>}
                  <TableCell>
                    <span className="font-bold text-lg">{a.total_score}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(a.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => viewDetails(a)}>
                      Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Penilaian</DialogTitle>
          </DialogHeader>
          {selectedAssessment && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                <div>
                  <p className="text-muted-foreground">Instrumen</p>
                  <p className="font-medium">{selectedAssessment.template?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tanggal</p>
                  <p className="font-medium">{new Date(selectedAssessment.assessment_date).toLocaleDateString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dodiknis</p>
                  <p className="font-medium">{selectedAssessment.preceptor?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Nilai</p>
                  <p className="font-bold text-blue-600 text-lg">{selectedAssessment.total_score}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 border-b pb-2">Rincian Nilai</h4>
                <div className="space-y-3">
                  {selectedAssessment.template?.rubric_schema?.indicators?.map((indicator) => {
                    const score = selectedAssessment.scores?.find(s => s.rubric_key === indicator.key);
                    return (
                      <div key={indicator.key} className="flex justify-between items-center text-sm">
                        <span>{indicator.label}</span>
                        <span className="font-medium px-2 py-1 bg-gray-100 rounded">
                          {score ? score.score : "0"} / {indicator.max_score}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 border-b pb-2">Umpan Balik (Feedback)</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-yellow-50/50 p-4 rounded-lg border border-yellow-100">
                  {selectedAssessment.feedback_notes || "Tidak ada catatan."}
                </p>
              </div>

              {isStudent && selectedAssessment.status === "submitted" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between mt-6">
                  <div>
                    <h5 className="font-medium text-blue-800">Persetujuan Penilaian</h5>
                    <p className="text-sm text-blue-600">Klik tombol di samping untuk menyatakan Anda telah menerima hasil ini.</p>
                  </div>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                    onClick={() => handleAcknowledge(selectedAssessment.id)}
                    disabled={acknowledging}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Setujui (Acknowledge)
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
