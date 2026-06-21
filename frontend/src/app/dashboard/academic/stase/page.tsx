"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function StaseManagement() {
  const [stases, setStases] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    program_id: "",
    code: "",
    name: "",
    duration_weeks: 4,
    passing_grade: 60,
  });

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
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/academic/stase", formData);
      setIsOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manajemen Stase</h1>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            Tambah Stase
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Stase Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Program Studi</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
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
                  <Input type="number" required value={formData.duration_weeks} onChange={(e) => setFormData({...formData, duration_weeks: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nilai Lulus</label>
                  <Input type="number" step="0.01" required value={formData.passing_grade} onChange={(e) => setFormData({...formData, passing_grade: Number(e.target.value)})} />
                </div>
              </div>
              <Button type="submit" className="w-full">Simpan</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-white dark:bg-gray-900 overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Stase</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Durasi</TableHead>
              <TableHead>Nilai Lulus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Memuat data...</TableCell>
              </TableRow>
            ) : stases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Belum ada data stase.</TableCell>
              </TableRow>
            ) : (
              stases.map((stase) => (
                <TableRow key={stase.id}>
                  <TableCell className="font-medium whitespace-nowrap">{stase.code}</TableCell>
                  <TableCell className="whitespace-nowrap">{stase.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{stase.program?.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{stase.duration_weeks} Minggu</TableCell>
                  <TableCell className="whitespace-nowrap">{stase.passing_grade}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
