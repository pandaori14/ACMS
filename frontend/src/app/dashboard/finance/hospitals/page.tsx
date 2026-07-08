"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  invoice_number?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  hospital?: { name: string } | null;
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

export default function HospitalBillingsPage() {
  const t = useTranslations("financeHospitals");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    period: "Q1-2026",
    start_date: "2026-01-01",
    end_date: "2026-03-31",
    rate_per_student: 1500000
  });

  const { data: billings = [] } = useQuery({
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
      toast.success(t("calcSuccess"));
      queryClient.invalidateQueries({ queryKey: ['billings'] });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(t("calcError", { error: getApiErrorMessage(error, error.message) }));
    }
  });

  // Catat pembayaran (metode + referensi + tanggal) — bukan sekadar ubah status
  const [payingBilling, setPayingBilling] = useState<Billing | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(EMPTY_PAYMENT);

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: PaymentForm }) => {
      return api.post(`/api/v1/finance/billings/${id}/payment`, form);
    },
    onSuccess: () => {
      toast.success(t("paymentSuccess"));
      queryClient.invalidateQueries({ queryKey: ['billings'] });
      setPayingBilling(null);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, t("paymentError")));
    }
  });

  const downloadInvoice = async (billing: Billing) => {
    toast.loading(t("invoiceLoading"), { id: "invoice-dl" });
    try {
      const res = await api.get(`/api/v1/finance/billings/${billing.id}/invoice`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice_${(billing.hospital?.name || "RS").replace(/\s+/g, "_")}_${billing.period}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success(t("invoiceDownloaded"), { id: "invoice-dl" });
    } catch {
      toast.error(t("invoiceError"), { id: "invoice-dl" });
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
              <RefreshCcw className="h-4 w-4" />
              {t("calcTrigger")}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t("calcDialogTitle")}</DialogTitle>
                <DialogDescription>
                  {t("calcDialogDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="period" className="text-right">{t("period")}</Label>
                  <Input id="period" value={formData.period} onChange={(e) => setFormData({...formData, period: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="start_date" className="text-right">{t("startDate")}</Label>
                  <Input type="date" id="start_date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="end_date" className="text-right">{t("endDate")}</Label>
                  <Input type="date" id="end_date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="rate" className="text-right">{t("ratePerStudent")}</Label>
                  <Input type="number" id="rate" value={formData.rate_per_student} onChange={(e) => setFormData({...formData, rate_per_student: parseInt(e.target.value) || 0})} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button disabled={generateMutation.isPending} onClick={() => generateMutation.mutate(formData)}>
                  {generateMutation.isPending ? t("calculating") : t("processBilling")}
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
            } catch {
              toast.error(t("exportError"));
            }
          }} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
            <FileText className="h-4 w-4" />
            {t("downloadExcel")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {billings.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>{t("empty")}</p>
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
                <p className="text-sm text-muted-foreground mb-2">{t("notes")}: {billing.notes || "-"}</p>
                {billing.status === "PAID" && billing.paid_at && (
                  <p className="text-xs text-emerald-600 mb-2">
                    {t("paidOn", { date: new Date(billing.paid_at).toLocaleDateString("id-ID") })}
                    {billing.payment_method ? t("paidVia", { method: billing.payment_method }) : ""}
                    {billing.payment_reference ? t("paidRef", { reference: billing.payment_reference }) : ""}
                  </p>
                )}

                <div className="flex flex-col gap-2 mt-2">
                  {billing.status === "PENDING" && (
                    <Button
                      variant="outline"
                      className="w-full text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => {
                        setPaymentForm(EMPTY_PAYMENT);
                        setPayingBilling(billing);
                      }}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" /> {t("recordPayment")}
                    </Button>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => downloadInvoice(billing)}>
                    <FileText className="mr-2 h-4 w-4" /> {t("downloadInvoice")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog catat pembayaran */}
      <Dialog open={!!payingBilling} onOpenChange={(open) => !open && setPayingBilling(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("payDialogTitle")}</DialogTitle>
            <DialogDescription>
              {payingBilling?.hospital?.name} — {payingBilling?.period} — Rp{" "}
              {new Intl.NumberFormat("id-ID").format(payingBilling?.amount || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>{t("paymentDate")}</Label>
              <Input
                type="date"
                value={paymentForm.paid_at}
                onChange={(e) => setPaymentForm({ ...paymentForm, paid_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("paymentMethod")}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              >
                <option value="Transfer Bank">{t("methodBankTransfer")}</option>
                <option value="Virtual Account">{t("methodVirtualAccount")}</option>
                <option value="Tunai">{t("methodCash")}</option>
                <option value="Lainnya">{t("methodOther")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t("paymentRefLabel")}</Label>
              <Input
                placeholder={t("paymentRefPlaceholder")}
                value={paymentForm.payment_reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={recordPaymentMutation.isPending}
              onClick={() => payingBilling && recordPaymentMutation.mutate({ id: payingBilling.id, form: paymentForm })}
            >
              {recordPaymentMutation.isPending ? tc("saving") : t("savePayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
