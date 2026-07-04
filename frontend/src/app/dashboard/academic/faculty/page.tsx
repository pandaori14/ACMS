"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Faculty, Program } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, BookOpen, Pencil, Trash2 } from "lucide-react";
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

const EMPTY_PROGRAM = { faculty_id: "", code: "", name: "", accreditation: "Unggul" };

export default function FacultyManagement() {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fakultas: tambah/edit/hapus
  const [isFacultyOpen, setIsFacultyOpen] = useState(false);
  const [facultyName, setFacultyName] = useState("");
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [deletingFaculty, setDeletingFaculty] = useState<Faculty | null>(null);

  // Program: tambah/edit/hapus
  const [isProgramOpen, setIsProgramOpen] = useState(false);
  const [programData, setProgramData] = useState(EMPTY_PROGRAM);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [deletingProgram, setDeletingProgram] = useState<Program | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [facRes, progRes] = await Promise.all([
        api.get("/api/v1/academic/faculties"),
        api.get("/api/v1/academic/programs"),
      ]);
      setFaculties(facRes.data.data || facRes.data);
      setPrograms(progRes.data.data || progRes.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memuat data."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---------- Fakultas ----------

  const openFacultyForm = (f?: Faculty) => {
    setEditingFaculty(f || null);
    setFacultyName(f?.name || "");
    setIsFacultyOpen(true);
  };

  const handleSaveFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFaculty) {
        await api.put(`/api/v1/academic/faculties/${editingFaculty.id}`, { name: facultyName });
        toast.success("Fakultas diperbarui.");
      } else {
        await api.post("/api/v1/academic/faculties", { name: facultyName });
        toast.success("Fakultas ditambahkan.");
      }
      setIsFacultyOpen(false);
      setFacultyName("");
      setEditingFaculty(null);
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan fakultas."));
    }
  };

  const handleDeleteFaculty = async () => {
    if (!deletingFaculty) return;
    try {
      await api.delete(`/api/v1/academic/faculties/${deletingFaculty.id}`);
      toast.success("Fakultas dihapus.");
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus fakultas."));
    } finally {
      setDeletingFaculty(null);
    }
  };

  // ---------- Program ----------

  const openProgramForm = (p?: Program) => {
    setEditingProgram(p || null);
    setProgramData(
      p
        ? {
            faculty_id: p.faculty_id || p.faculty?.id || "",
            code: p.code || "",
            name: p.name || "",
            accreditation: p.accreditation || "Unggul",
          }
        : EMPTY_PROGRAM
    );
    setIsProgramOpen(true);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProgram) {
        await api.put(`/api/v1/academic/programs/${editingProgram.id}`, programData);
        toast.success("Program studi diperbarui.");
      } else {
        await api.post("/api/v1/academic/programs", programData);
        toast.success("Program studi ditambahkan.");
      }
      setIsProgramOpen(false);
      setProgramData(EMPTY_PROGRAM);
      setEditingProgram(null);
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan program studi."));
    }
  };

  const handleDeleteProgram = async () => {
    if (!deletingProgram) return;
    try {
      await api.delete(`/api/v1/academic/programs/${deletingProgram.id}`);
      toast.success("Program studi dihapus.");
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus program studi."));
    } finally {
      setDeletingProgram(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Fakultas & Program Studi
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manajemen daftar fakultas dan program studi klinis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fakultas */}
        <Card className="clean-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-500" />
              <CardTitle className="text-lg">Fakultas</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => openFacultyForm()}>
              Tambah
            </Button>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Fakultas</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-slate-500">Memuat...</TableCell>
                  </TableRow>
                ) : faculties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-slate-500 py-8">
                      Belum ada fakultas.
                    </TableCell>
                  </TableRow>
                ) : (
                  faculties.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">{f.name}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => openFacultyForm(f)} aria-label="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeletingFaculty(f)}
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
          </CardContent>
        </Card>

        {/* Program Studi */}
        <Card className="clean-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-slate-500" />
              <CardTitle className="text-lg">Program Studi</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => openProgramForm()}>
              Tambah
            </Button>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Program</TableHead>
                  <TableHead>Akreditasi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-500">Memuat...</TableCell>
                  </TableRow>
                ) : programs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                      Belum ada program studi.
                    </TableCell>
                  </TableRow>
                ) : (
                  programs.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.code}</TableCell>
                      <TableCell className="text-slate-900 dark:text-slate-100">{p.name}</TableCell>
                      <TableCell>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-xs font-semibold">
                          {p.accreditation || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => openProgramForm(p)} aria-label="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeletingProgram(p)}
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
          </CardContent>
        </Card>
      </div>

      {/* Dialog fakultas */}
      <Dialog open={isFacultyOpen} onOpenChange={setIsFacultyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFaculty ? "Edit Fakultas" : "Tambah Fakultas"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveFaculty} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Fakultas</label>
              <Input
                required
                value={facultyName}
                onChange={(e) => setFacultyName(e.target.value)}
                placeholder="Contoh: Fakultas Kedokteran"
              />
            </div>
            <Button type="submit" className="w-full">Simpan</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog program */}
      <Dialog open={isProgramOpen} onOpenChange={setIsProgramOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProgram ? "Edit Program Studi" : "Tambah Program Studi"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProgram} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fakultas</label>
              <select
                className={selectClass}
                value={programData.faculty_id}
                onChange={(e) => setProgramData({ ...programData, faculty_id: e.target.value })}
                required
              >
                <option value="">Pilih Fakultas</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kode</label>
              <Input
                required
                value={programData.code}
                onChange={(e) => setProgramData({ ...programData, code: e.target.value })}
                placeholder="Contoh: PDS-IL"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Program</label>
              <Input
                required
                value={programData.name}
                onChange={(e) => setProgramData({ ...programData, name: e.target.value })}
                placeholder="Contoh: Ilmu Penyakit Dalam"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Akreditasi</label>
              <select
                className={selectClass}
                value={programData.accreditation}
                onChange={(e) => setProgramData({ ...programData, accreditation: e.target.value })}
                required
              >
                <option value="Unggul">Unggul</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="Baik Sekali">Baik Sekali</option>
                <option value="Baik">Baik</option>
              </select>
            </div>
            <Button type="submit" className="w-full">Simpan</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus fakultas */}
      <Dialog open={!!deletingFaculty} onOpenChange={(open) => !open && setDeletingFaculty(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Fakultas?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Fakultas <span className="font-semibold">{deletingFaculty?.name}</span> akan dihapus.
            Fakultas yang masih memiliki program studi tidak dapat dihapus.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeletingFaculty(null)}>Batal</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteFaculty}>
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus program */}
      <Dialog open={!!deletingProgram} onOpenChange={(open) => !open && setDeletingProgram(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Program Studi?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Program <span className="font-semibold">{deletingProgram?.name}</span> akan dihapus.
            Program yang masih memiliki stase atau mahasiswa tidak dapat dihapus.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeletingProgram(null)}>Batal</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteProgram}>
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
