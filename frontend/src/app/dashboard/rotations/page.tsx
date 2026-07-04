"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-helpers";

interface Program {
  id: string;
  name: string;
}

interface RotationPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  program: Program;
}

export default function RotationPeriodsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    program_id: "",
    name: "",
    start_date: "",
    end_date: "",
    status: "draft",
  });

  const { data: periodsData, isLoading: loadingPeriods, refetch: refetchPeriods } = useQuery({
    queryKey: ['rotation_periods'],
    queryFn: async (): Promise<RotationPeriod[]> => {
      const res = await api.get("/api/v1/rotation/periods");
      return res.data.data || [];
    }
  });

  const { data: programsData, isLoading: loadingPrograms } = useQuery({
    queryKey: ['programs'],
    queryFn: async (): Promise<Program[]> => {
      const res = await api.get("/api/v1/academic/programs");
      return res.data.data || [];
    }
  });

  const periods = periodsData || [];
  const programs = programsData || [];
  const loading = loadingPeriods || loadingPrograms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/rotation/periods", formData);
      setIsOpen(false);
      resetForm();
      toast.success("Periode rotasi disimpan.");
      refetchPeriods();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan periode rotasi."));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus periode ini?")) return;
    try {
      await api.delete(`/api/v1/rotation/periods/${id}`);
      toast.success("Periode rotasi dihapus.");
      refetchPeriods();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus periode rotasi."));
    }
  };

  const resetForm = () => {
    setFormData({ program_id: "", name: "", start_date: "", end_date: "", status: "draft" });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jadwal Rotasi</h1>
          <p className="text-muted-foreground mt-1">Pilih atau buat periode rotasi untuk mulai mengatur jadwal.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="h-4 w-4" /> Buat Periode
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Periode Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Program Studi</Label>
                <Select value={formData.program_id} onValueChange={(val) => setFormData({ ...formData, program_id: val ?? "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Program Studi" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nama Periode</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ganjil 2026/2027"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tanggal Mulai</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Selesai</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Simpan Periode</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))
        ) : periods.length === 0 ? (
          <div className="col-span-full py-12 text-center clean-card border-dashed">
            <h3 className="text-lg font-medium">Belum ada Periode Rotasi</h3>
            <p className="text-muted-foreground mt-2">Buat periode baru untuk mulai mengatur jadwal stase mahasiswa.</p>
          </div>
        ) : (
          periods.map((period) => (
            <div key={period.id} className="group relative clean-card p-6 hover:border-blue-500 hover:shadow-md transition-all bg-white">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 text-blue-700 rounded-lg p-2.5 inline-flex">
                  <Calendar className="h-6 w-6" />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  period.status === 'draft' ? 'bg-slate-100 text-slate-700' :
                  period.status === 'published' ? 'bg-blue-100 text-blue-700' :
                  period.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {period.status.toUpperCase()}
                </span>
              </div>
              
              <h3 className="text-xl font-bold mb-1">{period.name}</h3>
              <p className="text-sm text-slate-500 mb-6">{period.program.name}</p>
              
              <div className="space-y-2 text-sm text-slate-600 mb-6 border-t pt-4">
                <div className="flex justify-between">
                  <span>Mulai:</span>
                  <span className="font-medium text-slate-900">{new Date(period.start_date).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Selesai:</span>
                  <span className="font-medium text-slate-900">{new Date(period.end_date).toLocaleDateString('id-ID')}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Link 
                  href={`/dashboard/rotations/${period.id}`}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full group-hover:bg-blue-600"
                >
                  Atur Jadwal <ArrowRight className="h-4 w-4" />
                </Link>
                <Button variant="outline" size="icon" className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => {
                  e.preventDefault();
                  handleDelete(period.id);
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
