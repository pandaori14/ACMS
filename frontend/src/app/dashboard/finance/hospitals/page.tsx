"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Building2, FileText, CheckCircle, RefreshCcw } from "lucide-react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Billing {
  id: string;
  period: string;
  status: string;
  amount: number;
  notes?: string | null;
  hospital?: { name: string } | null;
}

export default function HospitalBillingsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    period: "Q1-2026",
    start_date: "2026-01-01",
    end_date: "2026-03-31",
    rate_per_student: 1500000
  });

  const { data: billings = [], isLoading: loading } = useQuery({
    queryKey: ['billings'],
    queryFn: async (): Promise<Billing[]> => {
      const res = await api.get("/api/v1/finance/billings");
      return res.data.data;
    }
  });

  const generateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post("/api/v1/finance/billings/generate", data);
    },
    onSuccess: () => {
      toast.success("Tagihan berhasil dikalkulasi.");
      queryClient.invalidateQueries({ queryKey: ['billings'] });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error("Gagal mengkalkulasi tagihan: " + (error.response?.data?.message || error.message));
    }
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.put(`/api/v1/finance/billings/${id}/status`, { status: "PAID" });
    },
    onSuccess: () => {
      toast.success("Status tagihan berhasil diubah menjadi PAID.");
      queryClient.invalidateQueries({ queryKey: ['billings'] });
    },
    onError: (error: any) => {
      toast.error("Gagal mengubah status: " + (error.response?.data?.message || error.message));
    }
  });



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tagihan Rumah Sakit</h1>
          <p className="text-muted-foreground">
            Kelola tagihan biaya pendidikan (Billing) ke Rumah Sakit Jejaring.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
              <RefreshCcw className="h-4 w-4" />
              Kalkulasi Tagihan
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Kalkulasi Tagihan RS</DialogTitle>
                <DialogDescription>
                  Masukkan parameter untuk menghitung tagihan biaya pendidikan ke rumah sakit berdasarkan data rotasi riil mahasiswa.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="period" className="text-right">Periode</Label>
                  <Input id="period" value={formData.period} onChange={(e) => setFormData({...formData, period: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="start_date" className="text-right">Tgl Mulai</Label>
                  <Input type="date" id="start_date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="end_date" className="text-right">Tgl Selesai</Label>
                  <Input type="date" id="end_date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="rate" className="text-right">Tarif/Mhs</Label>
                  <Input type="number" id="rate" value={formData.rate_per_student} onChange={(e) => setFormData({...formData, rate_per_student: parseInt(e.target.value) || 0})} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button disabled={generateMutation.isPending} onClick={() => generateMutation.mutate(formData)}>
                  {generateMutation.isPending ? "Mengkalkulasi..." : "Proses Tagihan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button onClick={async () => {
            try {
              const res = await api.get("/api/v1/finance/billings/export?period=Q1-2026", { responseType: 'blob' });
              const url = window.URL.createObjectURL(new Blob([res.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', 'billings_export.csv');
              document.body.appendChild(link);
              link.click();
              link.parentNode?.removeChild(link);
            } catch (err) {
              toast.error("Gagal mengunduh data tagihan.");
            }
          }} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
            <FileText className="h-4 w-4" />
            Unduh Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {billings.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>Belum ada tagihan yang dibuat.</p>
          </div>
        ) : (
          billings.map((billing) => (
            <Card key={billing.id} className="hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline">{billing.period}</Badge>
                  <Badge variant={billing.status === "PAID" ? "default" : "secondary"}>
                    {billing.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg leading-tight flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  {billing.hospital?.name}
                </CardTitle>
                <CardDescription className="mt-2 text-primary font-semibold text-xl">
                  Rp {new Intl.NumberFormat("id-ID").format(billing.amount)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Catatan: {billing.notes || "-"}</p>
                
                {billing.status === "PENDING" && (
                  <Button variant="outline" disabled={markPaidMutation.isPending} className="w-full text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => markPaidMutation.mutate(billing.id)}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Tandai Lunas
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
