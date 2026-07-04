"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserCircle, FileText, CheckCircle, RefreshCcw } from "lucide-react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Honorarium {
  id: string;
  period: string;
  status: string;
  amount: number;
  notes?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  preceptor?: { name: string } | null;
}

interface PaymentForm {
  paid_at: string;
  payment_method: string;
  payment_reference: string;
}

const EMPTY_PAYMENT: PaymentForm = {
  paid_at: new Date().toISOString().slice(0, 10),
  payment_method: "Transfer Bank",
  payment_reference: "",
};

export default function PreceptorHonorariumsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    period: "Q1-2026",
    start_date: "2026-01-01",
    end_date: "2026-03-31",
    guidance_rate: 500000,
    exam_rate: 100000
  });

  // Gate pakai permission (mencakup Keuangan, Admin Prodi, Super Admin)
  const isAdmin = user?.permissions?.includes("manage-finance");

  const { data: honorariums = [] } = useQuery({
    queryKey: ['honorariums'],
    queryFn: async (): Promise<Honorarium[]> => {
      const res = await api.get("/api/v1/finance/honorariums");
      return res.data.data;
    }
  });

  const generateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post("/api/v1/finance/honorariums/generate", data);
    },
    onSuccess: () => {
      toast.success("Honorarium berhasil dikalkulasi.");
      queryClient.invalidateQueries({ queryKey: ['honorariums'] });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Gagal mengkalkulasi honorarium: " + getApiErrorMessage(error, error.message));
    }
  });

  const [payingHonor, setPayingHonor] = useState<Honorarium | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(EMPTY_PAYMENT);

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: PaymentForm }) => {
      return api.post(`/api/v1/finance/honorariums/${id}/payment`, form);
    },
    onSuccess: () => {
      toast.success("Pembayaran honorarium dicatat. Notifikasi dikirim ke preceptor.");
      queryClient.invalidateQueries({ queryKey: ['honorariums'] });
      setPayingHonor(null);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Gagal mencatat pembayaran."));
    }
  });



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Honorarium Dodiknis</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Kelola pembayaran insentif bimbingan dan ujian." : "Daftar honorarium / insentif Anda."}
          </p>
        </div>
        
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button className="gap-2" />}>
              <RefreshCcw className="h-4 w-4" />
              Kalkulasi Honorarium
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Kalkulasi Honorarium Dodiknis</DialogTitle>
                <DialogDescription>
                  Hitung honorarium berdasarkan jumlah bimbingan mahasiswa dan tugas menguji.
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
                  <Label htmlFor="guidance_rate" className="text-right">Insentif Bim.</Label>
                  <Input type="number" id="guidance_rate" value={formData.guidance_rate} onChange={(e) => setFormData({...formData, guidance_rate: parseInt(e.target.value) || 0})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="exam_rate" className="text-right">Insentif Uji</Label>
                  <Input type="number" id="exam_rate" value={formData.exam_rate} onChange={(e) => setFormData({...formData, exam_rate: parseInt(e.target.value) || 0})} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button disabled={generateMutation.isPending} onClick={() => generateMutation.mutate(formData)}>
                  {generateMutation.isPending ? "Mengkalkulasi..." : "Proses Honorarium"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {honorariums.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>Belum ada honorarium yang tercatat.</p>
          </div>
        ) : (
          honorariums.map((honor) => (
            <Card key={honor.id} className="hover:shadow-md transition-all border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline">{honor.period}</Badge>
                  <Badge variant={honor.status === "PAID" ? "default" : "secondary"}>
                    {honor.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg leading-tight flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-muted-foreground" />
                  {honor.preceptor?.name}
                </CardTitle>
                <CardDescription className="mt-2 text-primary font-semibold text-xl">
                  Rp {new Intl.NumberFormat("id-ID").format(honor.amount)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">Catatan: {honor.notes || "-"}</p>
                {honor.status === "PAID" && honor.paid_at && (
                  <p className="text-xs text-emerald-600 mb-2">
                    Dibayar {new Date(honor.paid_at).toLocaleDateString("id-ID")}
                    {honor.payment_method ? ` via ${honor.payment_method}` : ""}
                    {honor.payment_reference ? ` (ref: ${honor.payment_reference})` : ""}
                  </p>
                )}

                {isAdmin && honor.status === "PENDING" && (
                  <Button
                    variant="outline"
                    className="w-full text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => {
                      setPaymentForm(EMPTY_PAYMENT);
                      setPayingHonor(honor);
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Catat Pembayaran
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog catat pembayaran honorarium */}
      <Dialog open={!!payingHonor} onOpenChange={(open) => !open && setPayingHonor(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Catat Pembayaran Honorarium</DialogTitle>
            <DialogDescription>
              {payingHonor?.preceptor?.name} — {payingHonor?.period} — Rp{" "}
              {new Intl.NumberFormat("id-ID").format(payingHonor?.amount || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Tanggal Pembayaran</Label>
              <Input
                type="date"
                value={paymentForm.paid_at}
                onChange={(e) => setPaymentForm({ ...paymentForm, paid_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              >
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="Virtual Account">Virtual Account</option>
                <option value="Tunai">Tunai</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>No. Referensi / Bukti (opsional)</Label>
              <Input
                placeholder="Contoh: TRX-20260704-001"
                value={paymentForm.payment_reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={recordPaymentMutation.isPending}
              onClick={() => payingHonor && recordPaymentMutation.mutate({ id: payingHonor.id, form: paymentForm })}
            >
              {recordPaymentMutation.isPending ? "Menyimpan..." : "Simpan Pembayaran"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
