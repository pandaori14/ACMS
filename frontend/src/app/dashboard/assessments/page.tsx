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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, FileText, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-helpers";

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

  // Edit & hapus (preceptor/admin)
  const [editing, setEditing] = useState<Assessment | null>(null);
  const [editScores, setEditScores] = useState<Record<string, number>>({});
  const [editFeedback, setEditFeedback] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState<Assessment | null>(null);

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

  const openEdit = (a: Assessment) => {
    const scores: Record<string, number> = {};
    a.template?.rubric_schema?.indicators?.forEach((ind) => {
      const found = a.scores?.find((s) => s.rubric_key === ind.key);
      scores[ind.key] = found ? Number(found.score) : 0;
    });
    setEditScores(scores);
    setEditFeedback(a.feedback_notes || "");
    setEditing(a);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setIsSavingEdit(true);
    try {
      await api.put(`/api/v1/assessments/${editing.id}`, {
        scores: editScores,
        feedback_notes: editFeedback,
      });
      toast.success("Penilaian diperbarui.");
      setEditing(null);
      fetchAssessments();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memperbarui penilaian."));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/api/v1/assessments/${deleting.id}`);
      toast.success("Penilaian dihapus.");
      fetchAssessments();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus penilaian."));
    } finally {
      setDeleting(null);
    }
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
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="outline" size="sm" onClick={() => viewDetails(a)}>
                      Detail
                    </Button>
                    {!isStudent && a.status !== "acknowledged" && (
                      <>
                        <Button variant="ghost" size="sm" className="ml-1" onClick={() => openEdit(a)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeleting(a)}
                          aria-label="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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

      {/* Dialog edit penilaian */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Penilaian — {editing?.student?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div className="space-y-3">
              {editing?.template?.rubric_schema?.indicators?.map((ind) => (
                <div key={ind.key} className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex-1">{ind.label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      type="number"
                      className="w-24"
                      min={0}
                      max={ind.max_score}
                      step="0.01"
                      value={editScores[ind.key] ?? 0}
                      onChange={(e) =>
                        setEditScores({ ...editScores, [ind.key]: Number(e.target.value) })
                      }
                    />
                    <span className="text-muted-foreground">/ {ind.max_score}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Umpan Balik</label>
              <Textarea
                required
                rows={4}
                value={editFeedback}
                onChange={(e) => setEditFeedback(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSavingEdit}>
              {isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus penilaian */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Penilaian?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Penilaian {deleting?.template?.name} untuk{" "}
            <span className="font-semibold">{deleting?.student?.name}</span> akan dihapus.
            Penilaian yang sudah disetujui mahasiswa tidak dapat dihapus.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
