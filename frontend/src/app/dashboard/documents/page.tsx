"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FileCheck2, Download, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GeneratedDoc {
  id: string;
  type: string;
  status: "processing" | "ready" | "failed";
  verification_code: string;
  created_at: string;
  meta?: { name?: string; average?: number | null; stase_count?: number } | null;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  processing: { label: "Diproses...", cls: "bg-amber-100 text-amber-700" },
  ready: { label: "Siap Diunduh", cls: "bg-emerald-100 text-emerald-700" },
  failed: { label: "Gagal", cls: "bg-red-100 text-red-700" },
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<GeneratedDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/yudisium/my-documents");
      setDocs(res.data.data || []);
    } catch {
      // biarkan list kosong
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // Polling ringan selama masih ada dokumen berstatus processing
  useEffect(() => {
    if (!docs.some((d) => d.status === "processing")) return;
    const t = setInterval(fetchDocs, 5000);
    return () => clearInterval(t);
  }, [docs, fetchDocs]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await api.post("/api/v1/yudisium/generate");
      toast.success(res.data.message);
      fetchDocs();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memulai pembuatan dokumen."));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (doc: GeneratedDoc) => {
    toast.loading("Mengunduh dokumen...", { id: "doc-dl" });
    try {
      const res = await api.get(`/api/v1/yudisium/documents/${doc.id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Transkrip_Resmi_${doc.verification_code.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success("Dokumen diunduh.", { id: "doc-dl" });
    } catch {
      toast.error("Gagal mengunduh dokumen.", { id: "doc-dl" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dokumen Resmi</h1>
          <p className="text-muted-foreground mt-1">
            Transkrip resmi ber-QR yang keasliannya dapat diverifikasi publik.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-blue-900 hover:bg-blue-800 text-white"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memulai...</>
          ) : (
            <><FileCheck2 className="w-4 h-4 mr-2" /> Buat Transkrip Resmi</>
          )}
        </Button>
      </div>

      <Card className="clean-card border-l-4 border-l-blue-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-900" /> Bagaimana verifikasi bekerja?
          </CardTitle>
          <CardDescription>
            Setiap PDF memuat QR code unik. Siapa pun (rumah sakit, institusi lain) dapat memindainya
            untuk memastikan dokumen asli diterbitkan oleh sistem ACMS FK UMS — tanpa perlu login.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="rounded-md border bg-white dark:bg-gray-900 overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal Dibuat</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Ringkasan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-10">
                  Memuat...
                </TableCell>
              </TableRow>
            ) : docs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <FileCheck2 className="w-10 h-10 text-slate-300" />
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">
                        Belum ada dokumen resmi
                      </p>
                      <p className="text-sm text-slate-500">
                        Klik &ldquo;Buat Transkrip Resmi&rdquo; — dokumen diproses di latar belakang (±1 menit).
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              docs.map((doc) => {
                const badge = STATUS_BADGE[doc.status] || STATUS_BADGE.processing;
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(doc.created_at).toLocaleString("id-ID", {
                        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>Transkrip Resmi</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.meta?.stase_count != null
                        ? `${doc.meta.stase_count} stase — rata-rata ${doc.meta.average ?? "-"}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={badge.cls}>
                        {doc.status === "processing" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {doc.status === "ready" && (
                        <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                          <Download className="w-4 h-4 mr-1" /> Unduh
                        </Button>
                      )}
                      {doc.status === "failed" && (
                        <Button variant="outline" size="sm" onClick={handleGenerate}>
                          <RefreshCw className="w-4 h-4 mr-1" /> Coba Lagi
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
