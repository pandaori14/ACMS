"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Building2, BookOpen } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";

export default function FacultyManagement() {
  const [faculties, setFaculties] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFacultyOpen, setIsFacultyOpen] = useState(false);
  const [facultyName, setFacultyName] = useState("");

  const [isProgramOpen, setIsProgramOpen] = useState(false);
  const [programData, setProgramData] = useState({
    faculty_id: "",
    code: "",
    name: "",
    accreditation: "Unggul"
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [facRes, progRes] = await Promise.all([
        api.get("/api/academic/faculties"),
        api.get("/api/academic/programs")
      ]);
      setFaculties(facRes.data.data || facRes.data);
      setPrograms(progRes.data.data || progRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/academic/faculties", { name: facultyName });
      setIsFacultyOpen(false);
      setFacultyName("");
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Gagal menambahkan Fakultas.");
    }
  };

  const handleAddProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/academic/programs", programData);
      setIsProgramOpen(false);
      setProgramData({ faculty_id: "", code: "", name: "", accreditation: "Unggul" });
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Gagal menambahkan Program Studi.");
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
            <Dialog open={isFacultyOpen} onOpenChange={setIsFacultyOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" />}>
                Tambah
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Fakultas</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddFaculty} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nama Fakultas</label>
                    <Input required value={facultyName} onChange={(e) => setFacultyName(e.target.value)} placeholder="Contoh: Fakultas Kedokteran" />
                  </div>
                  <Button type="submit" className="w-full">Simpan</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nama Fakultas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-slate-500">Memuat...</TableCell>
                  </TableRow>
                ) : faculties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-slate-500">Belum ada fakultas.</TableCell>
                  </TableRow>
                ) : (
                  faculties.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-slate-500">{f.id}</TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">{f.name}</TableCell>
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
            <Dialog open={isProgramOpen} onOpenChange={setIsProgramOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" />}>
                Tambah
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Program Studi</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddProgram} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fakultas</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={programData.faculty_id}
                      onChange={(e) => setProgramData({...programData, faculty_id: e.target.value})}
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
                    <Input required value={programData.code} onChange={(e) => setProgramData({...programData, code: e.target.value})} placeholder="Contoh: PDS-IL" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nama Program</label>
                    <Input required value={programData.name} onChange={(e) => setProgramData({...programData, name: e.target.value})} placeholder="Contoh: Ilmu Penyakit Dalam" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Akreditasi</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={programData.accreditation}
                      onChange={(e) => setProgramData({...programData, accreditation: e.target.value})}
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
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Program</TableHead>
                  <TableHead>Akreditasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-slate-500">Memuat...</TableCell>
                  </TableRow>
                ) : programs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-slate-500">Belum ada program studi.</TableCell>
                  </TableRow>
                ) : (
                  programs.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.code}</TableCell>
                      <TableCell className="text-slate-900 dark:text-slate-100">{p.name}</TableCell>
                      <TableCell>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-xs font-semibold">
                          {p.accreditation || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
