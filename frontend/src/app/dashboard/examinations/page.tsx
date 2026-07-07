"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Stase } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PlusCircle, ClipboardCheck, Clock, FileText, Pencil, Trash2, X } from "lucide-react";

interface Exam {
  id: string;
  type: string;
  status: string;
  name: string;
  date: string;
  start_time?: string | null;
  duration_minutes?: number | null;
  passing_score?: number | null;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  description?: string | null;
  stase_id?: string;
  stase?: { id?: string; name?: string } | null;
}

interface ExamForm {
  name: string;
  type: string;
  stase_id: string;
  date: string;
  start_time: string;
  duration_minutes: string;
  passing_score: string;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  description: string;
}

const EMPTY_FORM: ExamForm = {
  name: "",
  type: "OSCE",
  stase_id: "",
  date: "",
  start_time: "",
  duration_minutes: "",
  passing_score: "",
  shuffle_questions: false,
  shuffle_options: false,
  description: "",
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

export default function ExaminationsPage() {
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions;
  const queryClient = useQueryClient();

  const { data: examsData, isLoading: loading } = useQuery({
    queryKey: ["examinations"],
    queryFn: async (): Promise<Exam[]> => {
      const res = await api.get("/api/v1/examinations");
      return res.data.data;
    },
  });

  const canManage = permissions?.includes("manage-examinations");
  const isStudent = user?.roles?.includes("Mahasiswa");
  const isPreceptor = user?.roles?.includes("Dodiknis");

  const { data: staseData } = useQuery({
    queryKey: ["stase-list"],
    queryFn: async (): Promise<Stase[]> => {
      const res = await api.get("/api/v1/academic/stase");
      return res.data.data;
    },
    enabled: !!canManage,
    staleTime: 5 * 60 * 1000,
  });

  const exams = examsData || [];
  const stases = staseData || [];

  // Dialog buat/edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("DRAFT");
  const [form, setForm] = useState<ExamForm>(EMPTY_FORM);
  const [stations, setStations] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState<Exam | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["examinations"] });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setStations([]);
    setIsFormOpen(true);
  };

  const openEdit = (exam: Exam) => {
    setEditingId(exam.id);
    setEditingStatus(exam.status);
    setForm({
      name: exam.name,
      type: exam.type,
      stase_id: exam.stase_id || exam.stase?.id || "",
      date: exam.date?.slice(0, 10) || "",
      start_time: exam.start_time ? exam.start_time.slice(0, 5) : "",
      duration_minutes: exam.duration_minutes != null ? String(exam.duration_minutes) : "",
      passing_score: exam.passing_score != null ? String(exam.passing_score) : "",
      shuffle_questions: !!exam.shuffle_questions,
      shuffle_options: !!exam.shuffle_options,
      description: exam.description || "",
    });
    setIsFormOpen(true);
  };

  // Normalisasi form → payload API (string kosong = null)
  const toPayload = (f: ExamForm) => ({
    name: f.name,
    type: f.type,
    stase_id: f.stase_id,
    date: f.date,
    start_time: f.start_time || null,
    duration_minutes: f.duration_minutes ? Number(f.duration_minutes) : null,
    passing_score: f.passing_score ? Number(f.passing_score) : null,
    shuffle_questions: f.shuffle_questions,
    shuffle_options: f.shuffle_options,
    description: f.description,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingId) {
        // Tipe & stase hanya boleh dikirim saat DRAFT (aturan backend)
        const full = toPayload(form);
        const payload =
          editingStatus === "DRAFT"
            ? full
            : {
                name: full.name,
                date: full.date,
                description: full.description,
                start_time: full.start_time,
                duration_minutes: full.duration_minutes,
                passing_score: full.passing_score,
              };
        await api.put(`/api/v1/examinations/${editingId}`, payload);
        toast.success("Ujian diperbarui.");
      } else {
        await api.post("/api/v1/examinations", {
          ...toPayload(form),
          stations:
            form.type === "OSCE"
              ? stations.filter((s) => s.trim() !== "").map((name) => ({ name }))
              : undefined,
        });
        toast.success("Ujian dijadwalkan.");
      }
      setIsFormOpen(false);
      refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan ujian."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/api/v1/examinations/${deleting.id}`);
      toast.success("Ujian dihapus.");
      refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus ujian."));
    } finally {
      setDeleting(null);
    }
  };

  const handleChangeStatus = async (exam: Exam, status: string) => {
    try {
      await api.patch(`/api/v1/examinations/${exam.id}/status`, { status });
      toast.success(`Status ujian diubah ke ${status}.`);
      refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal mengubah status."));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Ujian</h1>
          <p className="text-muted-foreground">
            {canManage ? "Kelola jadwal ujian OSCE, CBT, dan tertulis" : "Daftar ujian yang harus Anda ikuti atau uji"}
          </p>
        </div>

        {canManage && (
          <Button className="flex items-center gap-2" onClick={openCreate}>
            <PlusCircle className="h-4 w-4" />
            Jadwalkan Ujian Baru
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {exams.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            <ClipboardCheck className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>Belum ada ujian yang dijadwalkan.</p>
            {canManage && (
              <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
                <PlusCircle className="h-4 w-4 mr-2" /> Jadwalkan Ujian
              </Button>
            )}
          </div>
        ) : (
          exams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-md transition-all group flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={exam.type === "OSCE" ? "default" : "secondary"}>
                    {exam.type}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Badge variant={exam.status === "COMPLETED" ? "outline" : (exam.status === "ONGOING" ? "destructive" : "secondary")}>
                      {exam.status}
                    </Badge>
                    {canManage && exam.status !== "COMPLETED" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(exam)}
                          aria-label="Edit ujian"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          onClick={() => setDeleting(exam)}
                          aria-label="Hapus ujian"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                  {exam.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <FileText className="h-4 w-4" />
                  {exam.stase?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <div className="flex items-center text-sm text-muted-foreground mb-4">
                  <Clock className="mr-2 h-4 w-4" />
                  {new Date(exam.date).toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {exam.start_time ? ` · ${exam.start_time.slice(0, 5)}` : ""}
                  {exam.duration_minutes ? ` · ${exam.duration_minutes} mnt` : ""}
                </div>

                <div className="flex flex-col gap-2">
                  {isPreceptor && exam.status !== "COMPLETED" && (
                    <Button variant="default" className="w-full" onClick={() => window.location.href = `/dashboard/examinations/${exam.id}/assess`}>
                      Mulai Menilai
                    </Button>
                  )}
                  {canManage && (
                    <Button variant="outline" className="w-full" onClick={() => window.location.href = `/dashboard/examinations/${exam.id}`}>
                      Detail & Peserta
                    </Button>
                  )}
                  {canManage && exam.status === "DRAFT" && (
                    <Button variant="secondary" className="w-full" onClick={() => handleChangeStatus(exam, "ONGOING")}>
                      Mulai Ujian (ONGOING)
                    </Button>
                  )}
                  {canManage && exam.status === "ONGOING" && (
                    <Button variant="secondary" className="w-full" onClick={() => handleChangeStatus(exam, "COMPLETED")}>
                      Selesaikan Ujian
                    </Button>
                  )}
                  {isStudent && !canManage && (exam.type === "CBT" || exam.type === "WRITTEN") && exam.status === "ONGOING" && (
                    <Button
                      className="w-full bg-blue-900 hover:bg-blue-800 text-white"
                      onClick={() => window.location.href = `/dashboard/examinations/${exam.id}/take`}
                    >
                      Kerjakan Ujian
                    </Button>
                  )}
                  {isStudent && !canManage && !((exam.type === "CBT" || exam.type === "WRITTEN") && exam.status === "ONGOING") && (
                    <Button variant="outline" className="w-full" disabled>
                      {exam.status === "DRAFT" ? "Belum Dibuka" : exam.status === "COMPLETED" ? "Ujian Selesai" : "Menunggu Dibuka"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog buat/edit ujian */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Ujian" : "Jadwalkan Ujian Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Ujian</label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: OSCE Penyakit Dalam Batch 1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipe</label>
                <select
                  className={selectClass}
                  required
                  disabled={!!editingId && editingStatus !== "DRAFT"}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="OSCE">OSCE</option>
                  <option value="CBT">CBT</option>
                  <option value="WRITTEN">Tertulis (WRITTEN)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal</label>
                <Input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Stase</label>
              <select
                className={selectClass}
                required
                disabled={!!editingId && editingStatus !== "DRAFT"}
                value={form.stase_id}
                onChange={(e) => setForm({ ...form, stase_id: e.target.value })}
              >
                <option value="">Pilih Stase</option>
                {stases.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Jam Mulai</label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Durasi (menit)</label>
                <Input
                  type="number"
                  min={5}
                  max={600}
                  placeholder="mis. 90"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nilai Lulus</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="default stase"
                  value={form.passing_score}
                  onChange={(e) => setForm({ ...form, passing_score: e.target.value })}
                />
              </div>
            </div>
            {(form.type === "CBT" || form.type === "WRITTEN") && (
              <>
                <p className="text-xs text-muted-foreground -mt-2">
                  Durasi dipakai sebagai timer ujian online. Bank soal dikelola dari halaman detail ujian.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm rounded-md border p-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={form.shuffle_questions}
                      onChange={(e) => setForm({ ...form, shuffle_questions: e.target.checked })}
                    />
                    Acak urutan soal per peserta
                  </label>
                  <label className="flex items-center gap-2 text-sm rounded-md border p-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={form.shuffle_options}
                      onChange={(e) => setForm({ ...form, shuffle_options: e.target.checked })}
                    />
                    Acak urutan opsi jawaban
                  </label>
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Deskripsi (opsional)</label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {!editingId && form.type === "OSCE" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Stasiun OSCE</label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setStations([...stations, ""])}>
                    <PlusCircle className="h-4 w-4 mr-1" /> Stasiun
                  </Button>
                </div>
                {stations.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Stasiun bisa juga ditambahkan nanti dari halaman detail ujian.
                  </p>
                )}
                {stations.map((name, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={name}
                      placeholder={`Nama stasiun ${idx + 1}`}
                      onChange={(e) => {
                        const next = [...stations];
                        next[idx] = e.target.value;
                        setStations(next);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => setStations(stations.filter((_, i) => i !== idx))}
                      aria-label="Hapus stasiun"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Ujian?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Ujian <span className="font-semibold">{deleting?.name}</span> akan dihapus.
            Ujian yang sudah memiliki nilai tidak dapat dihapus.
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
