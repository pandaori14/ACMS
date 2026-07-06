"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Stase, Program } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
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

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

interface StaseForm {
  program_id: string;
  code: string;
  name: string;
  duration_weeks: number;
  passing_grade: number;
  prerequisite_stase_ids: string[];
}

const EMPTY_FORM: StaseForm = {
  program_id: "",
  code: "",
  name: "",
  duration_weeks: 4,
  passing_grade: 60,
  prerequisite_stase_ids: [],
};

export default function StaseManagement() {
  const [stases, setStases] = useState<Stase[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StaseForm>(EMPTY_FORM);
  const [deleting, setDeleting] = useState<Stase | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [staseRes, progRes] = await Promise.all([
        api.get("/api/v1/academic/stase"),
        api.get("/api/v1/academic/programs")
      ]);
      setStases(staseRes.data.data || staseRes.data);
      setPrograms(progRes.data.data || progRes.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memuat data stase."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsOpen(true);
  };

  const openEdit = (stase: Stase) => {
    setEditingId(stase.id);
    setFormData({
      program_id: stase.program_id || stase.program?.id || "",
      code: stase.code || "",
      name: stase.name || "",
      duration_weeks: stase.duration_weeks || 4,
      passing_grade: Number(stase.passing_grade) || 60,
      prerequisite_stase_ids: stase.prerequisite_stase_ids || [],
    });
    setIsOpen(true);
  };

  const togglePrerequisite = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      prerequisite_stase_ids: prev.prerequisite_stase_ids.includes(id)
        ? prev.prerequisite_stase_ids.filter((x) => x !== id)
        : [...prev.prerequisite_stase_ids, id],
    }));
  };

  const staseNames = (ids?: string[] | null) =>
    (ids || [])
      .map((id) => stases.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/api/v1/academic/stase/${editingId}`, formData);
        toast.success("Stase diperbarui.");
      } else {
        await api.post("/api/v1/academic/stase", formData);
        toast.success("Stase ditambahkan.");
      }
      setIsOpen(false);
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan data stase."));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/api/v1/academic/stase/${deleting.id}`);
      toast.success("Stase dihapus.");
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus stase."));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Stase</h1>
          <p className="text-muted-foreground mt-1">
            Departemen/bagian rotasi klinik beserta durasi dan nilai kelulusan.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-blue-900 hover:bg-blue-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> Tambah Stase
        </Button>
      </div>

      <div className="rounded-md border bg-white dark:bg-gray-900 overflow-x-auto">
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Stase</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Durasi</TableHead>
              <TableHead>Nilai Lulus</TableHead>
              <TableHead>Prasyarat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-10">Memuat data...</TableCell>
              </TableRow>
            ) : stases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <GraduationCap className="w-10 h-10 text-slate-300" />
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">Belum ada stase</p>
                      <p className="text-sm text-slate-500">
                        Stase diperlukan sebelum membuat jadwal rotasi dan ujian.
                      </p>
                    </div>
                    <Button size="sm" onClick={openCreate}>
                      <Plus className="w-4 h-4 mr-2" /> Tambah Stase
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              stases.map((stase) => (
                <TableRow key={stase.id}>
                  <TableCell className="font-medium whitespace-nowrap">{stase.code}</TableCell>
                  <TableCell className="whitespace-nowrap">{stase.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{stase.program?.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{stase.duration_weeks} Minggu</TableCell>
                  <TableCell className="whitespace-nowrap">{stase.passing_grade}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm text-slate-600 dark:text-slate-300" title={staseNames(stase.prerequisite_stase_ids)}>
                    {staseNames(stase.prerequisite_stase_ids) || <span className="text-slate-400">—</span>}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(stase)} aria-label="Edit">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleting(stase)}
                      aria-label="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog tambah/edit */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Stase" : "Tambah Stase Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Program Studi</label>
              <select
                className={selectClass}
                value={formData.program_id}
                onChange={(e) => setFormData({...formData, program_id: e.target.value})}
                required
              >
                <option value="">Pilih Program</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kode</label>
              <Input required value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Stase</label>
              <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Durasi (Minggu)</label>
                <Input type="number" required min={1} value={formData.duration_weeks} onChange={(e) => setFormData({...formData, duration_weeks: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nilai Lulus</label>
                <Input type="number" step="0.01" required min={0} max={100} value={formData.passing_grade} onChange={(e) => setFormData({...formData, passing_grade: Number(e.target.value)})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Stase Prasyarat</label>
              <p className="text-xs text-muted-foreground">
                Mahasiswa hanya bisa ditempatkan ke stase ini setelah menyelesaikan seluruh prasyarat.
              </p>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                {stases.filter((s) => s.id !== editingId).length === 0 ? (
                  <p className="text-sm text-slate-400 px-1">Belum ada stase lain.</p>
                ) : (
                  stases
                    .filter((s) => s.id !== editingId)
                    .map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm px-1 py-0.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={formData.prerequisite_stase_ids.includes(s.id)}
                          onChange={() => togglePrerequisite(s.id)}
                        />
                        {s.name} <span className="text-slate-400">({s.code})</span>
                      </label>
                    ))
                )}
              </div>
            </div>
            <Button type="submit" className="w-full">Simpan</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Stase?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Stase <span className="font-semibold">{deleting?.name}</span> akan dihapus.
            Pastikan tidak ada rotasi/ujian aktif yang memakai stase ini.
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
