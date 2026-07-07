"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { useAuthStore } from "@/store/useAuthStore";
import { Cohort, Student } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Award, Gauge, Plus, Search, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UkmppdRow {
  id: string;
  student_id: string;
  attempt_number: number;
  exam_date: string;
  cbt_score?: string | number | null;
  osce_score?: string | number | null;
  status: string;
  notes?: string | null;
  student?: { name?: string; identity_number?: string } | null;
}

interface ReadinessComponent {
  label: string;
  value: number;
  weight: number;
}

interface Readiness {
  score: number | null;
  components: ReadinessComponent[];
}

const selectClass =
  "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

export default function UkmppdPage() {
  const user = useAuthStore((state) => state.user);
  const isStudent = user?.roles?.includes("Mahasiswa") ?? false;
  const canManage = user?.permissions?.includes("manage-examinations") ?? false;

  // Mahasiswa
  const [myAttempts, setMyAttempts] = useState<UkmppdRow[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);

  // Admin
  const [rows, setRows] = useState<UkmppdRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, passed: 0, first_take_pass: 0, first_take_total: 0 });
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [filterCohort, setFilterCohort] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Form tambah hasil
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<Student[]>([]);
  const [form, setForm] = useState({
    student_id: "",
    attempt_number: 1,
    exam_date: "",
    cbt_score: "",
    osce_score: "",
    status: "passed",
    notes: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState<UkmppdRow | null>(null);

  const fetchAdmin = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/v1/examinations/ukmppd", {
        params: filterCohort ? { cohort_id: filterCohort } : {},
      });
      setRows(res.data.data || []);
      setMeta(res.data.meta || { total: 0, passed: 0, first_take_pass: 0, first_take_total: 0 });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memuat data UKMPPD."));
    } finally {
      setIsLoading(false);
    }
  }, [filterCohort]);

  useEffect(() => {
    if (isStudent) {
      api
        .get("/api/v1/examinations/ukmppd/my")
        .then((res) => {
          setMyAttempts(res.data.data.attempts || []);
          setReadiness(res.data.data.readiness || null);
        })
        .catch(() => toast.error("Gagal memuat riwayat UKMPPD."))
        .finally(() => setIsLoading(false));
    } else if (canManage) {
      fetchAdmin();
      api.get("/api/v1/academic/cohorts").then((res) => setCohorts(res.data.data || res.data)).catch(() => {});
    }
  }, [isStudent, canManage, fetchAdmin]);

  const searchStudents = async () => {
    try {
      const res = await api.get("/api/v1/academic/students", { params: { search, per_page: 10 } });
      setCandidates(res.data.data || []);
    } catch {
      toast.error("Gagal mencari mahasiswa.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post("/api/v1/examinations/ukmppd", {
        ...form,
        cbt_score: form.cbt_score === "" ? null : Number(form.cbt_score),
        osce_score: form.osce_score === "" ? null : Number(form.osce_score),
        notes: form.notes || null,
      });
      toast.success("Hasil UKMPPD tercatat.");
      setIsOpen(false);
      fetchAdmin();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan hasil."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/api/v1/examinations/ukmppd/${deleting.id}`);
      toast.success("Hasil dihapus.");
      fetchAdmin();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus hasil."));
    } finally {
      setDeleting(null);
    }
  };

  const statusBadge = (status: string) =>
    status === "passed" ? (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">LULUS</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">TIDAK LULUS</Badge>
    );

  // ─────────────── View Mahasiswa ───────────────
  if (isStudent) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">UKMPPD Saya</h1>
          <p className="text-muted-foreground mt-1">
            Riwayat ujian nasional dan perkiraan kesiapan berdasarkan performa akademik Anda.
          </p>
        </div>

        <Card className="clean-card border-l-4 border-l-blue-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="w-5 h-5 text-blue-900 dark:text-blue-300" /> Readiness Score
            </CardTitle>
            <CardDescription>
              Gabungan rata-rata nilai stase terbit (60%) dan CBT internal (40%) — indikator, bukan jaminan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {readiness?.score != null ? (
              <div className="flex items-center gap-6">
                <span className="text-5xl font-black text-blue-900 dark:text-blue-300">{readiness.score}</span>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {readiness.components.map((c) => (
                    <li key={c.label}>
                      {c.label}: <span className="font-medium text-foreground">{c.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada data nilai stase / CBT internal untuk menghitung kesiapan.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="rounded-md border bg-white dark:bg-gray-900 overflow-x-auto">
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow>
                <TableHead>Percobaan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>CBT</TableHead>
                <TableHead>OSCE</TableHead>
                <TableHead>Hasil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-10">Memuat...</TableCell></TableRow>
              ) : myAttempts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Award className="w-10 h-10 text-slate-300" />
                      <p className="text-sm text-slate-500">Belum ada riwayat UKMPPD tercatat.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                myAttempts.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>Ke-{row.attempt_number}</TableCell>
                    <TableCell>{row.exam_date?.slice(0, 10)}</TableCell>
                    <TableCell>{row.cbt_score ?? "—"}</TableCell>
                    <TableCell>{row.osce_score ?? "—"}</TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // ─────────────── View Admin ───────────────
  const passRate = meta.total > 0 ? Math.round((meta.passed / meta.total) * 100) : null;
  const firstTakeRate =
    meta.first_take_total > 0 ? Math.round((meta.first_take_pass / meta.first_take_total) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tracking UKMPPD</h1>
          <p className="text-muted-foreground mt-1">
            Hasil ujian nasional per mahasiswa per percobaan — bahan evaluasi kurikulum & akreditasi.
          </p>
        </div>
        <Button
          onClick={() => { setIsOpen(true); setCandidates([]); setSearch(""); setForm({ ...form, student_id: "" }); }}
          className="bg-blue-900 hover:bg-blue-800 text-white"
        >
          <Plus className="w-4 h-4 mr-2" /> Catat Hasil
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select className={selectClass} value={filterCohort} onChange={(e) => setFilterCohort(e.target.value)}>
          <option value="">Semua Angkatan</option>
          {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {passRate !== null && (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-sm px-3 py-1">
            Pass rate: {passRate}% ({meta.passed}/{meta.total})
          </Badge>
        )}
        {firstTakeRate !== null && (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-sm px-3 py-1">
            First-taker: {firstTakeRate}%
          </Badge>
        )}
      </div>

      <div className="rounded-md border bg-white dark:bg-gray-900 overflow-x-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>NIM</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Percobaan</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>CBT</TableHead>
              <TableHead>OSCE</TableHead>
              <TableHead>Hasil</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-slate-500 py-10">Memuat...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Award className="w-10 h-10 text-slate-300" />
                    <p className="text-sm text-slate-500">Belum ada hasil UKMPPD tercatat.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap font-medium">{row.student?.identity_number || "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.student?.name || "-"}</TableCell>
                  <TableCell>Ke-{row.attempt_number}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.exam_date?.slice(0, 10)}</TableCell>
                  <TableCell>{row.cbt_score ?? "—"}</TableCell>
                  <TableCell>{row.osce_score ?? "—"}</TableCell>
                  <TableCell>{statusBadge(row.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeleting(row)} aria-label="Hapus">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog catat hasil */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Catat Hasil UKMPPD</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mahasiswa</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Cari nama / NIM..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchStudents(); } }}
                />
                <Button type="button" variant="outline" onClick={searchStudents}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {candidates.length > 0 && (
                <select
                  className={`${selectClass} w-full`}
                  required
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                >
                  <option value="">Pilih mahasiswa...</option>
                  {candidates.map((s) => (
                    <option key={s.id} value={s.user_id || s.user?.id || ""}>
                      {s.user?.name} ({s.user?.identity_number})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Percobaan ke-</label>
                <Input type="number" min={1} max={10} required value={form.attempt_number}
                  onChange={(e) => setForm({ ...form, attempt_number: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal Ujian</label>
                <Input type="date" required value={form.exam_date}
                  onChange={(e) => setForm({ ...form, exam_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Skor CBT</label>
                <Input type="number" min={0} max={100} step="0.01" value={form.cbt_score}
                  onChange={(e) => setForm({ ...form, cbt_score: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Skor OSCE</label>
                <Input type="number" min={0} max={100} step="0.01" value={form.osce_score}
                  onChange={(e) => setForm({ ...form, osce_score: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hasil</label>
              <select className={`${selectClass} w-full`} value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="passed">Lulus</option>
                <option value="failed">Tidak Lulus</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Catatan (opsional)</label>
              <Input maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button type="submit" className="w-full" disabled={isSaving || !form.student_id}>
              {isSaving ? "Menyimpan..." : "Simpan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Hasil UKMPPD?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Hasil percobaan ke-{deleting?.attempt_number} milik{" "}
            <span className="font-semibold">{deleting?.student?.name}</span> akan dihapus.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>Hapus</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
