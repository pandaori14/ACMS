"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Cohort } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Megaphone, Send } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BroadcastRow {
  id: string;
  subject: string;
  body: string;
  target_type: string;
  target_id?: string | null;
  recipients_count: number;
  created_at: string;
  sender?: { name?: string } | null;
}

interface HospitalOption {
  id: string;
  name?: string;
}

const ROLES = ["Mahasiswa", "Dodiknis", "Admin RS", "Dosen", "Keuangan", "Admin Prodi", "Kaprodi"];

const TARGET_LABEL: Record<string, string> = {
  all: "Semua pengguna",
  role: "Per peran",
  cohort: "Per angkatan",
  hospital: "Per rumah sakit",
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

/**
 * Broadcast pesan massal: selalu masuk lonceng in-app penerima; email ikut
 * terkirim bila Settings `enable_email_broadcasts` aktif.
 */
export default function BroadcastsPage() {
  const [history, setHistory] = useState<BroadcastRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [targetId, setTargetId] = useState("");
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [isSending, setIsSending] = useState(false);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/v1/broadcasts");
      setHistory(res.data.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memuat riwayat broadcast."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    api.get("/api/v1/academic/cohorts").then((res) => setCohorts(res.data.data || res.data)).catch(() => {});
    api.get("/api/v1/rotation/hospitals").then((res) => setHospitals(res.data.data || [])).catch(() => {});
  }, [fetchHistory]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      const res = await api.post("/api/v1/broadcasts", {
        subject,
        body,
        target_type: targetType,
        target_id: targetType === "all" ? null : targetId,
      });
      toast.success(res.data.message);
      setSubject("");
      setBody("");
      fetchHistory();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal mengirim broadcast."));
    } finally {
      setIsSending(false);
    }
  };

  const targetSummary = (row: BroadcastRow) => {
    if (row.target_type === "role") return `Peran: ${row.target_id}`;
    if (row.target_type === "cohort") {
      return `Angkatan: ${cohorts.find((c) => c.id === row.target_id)?.name || row.target_id}`;
    }
    if (row.target_type === "hospital") {
      return `RS: ${hospitals.find((h) => h.id === row.target_id)?.name || row.target_id}`;
    }
    return TARGET_LABEL[row.target_type] || row.target_type;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Broadcast Pesan</h1>
        <p className="text-muted-foreground mt-1">
          Kirim pengumuman massal ke lonceng notifikasi pengguna (plus email bila diaktifkan di Settings).
        </p>
      </div>

      <Card className="clean-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-900 dark:text-blue-300" /> Buat Pengumuman
          </CardTitle>
          <CardDescription>Maks. 2000 penerima per kiriman · 5 broadcast per jam.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={send} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Target</label>
                <select
                  className={selectClass}
                  value={targetType}
                  onChange={(e) => { setTargetType(e.target.value); setTargetId(""); }}
                >
                  {Object.entries(TARGET_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              {targetType !== "all" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {targetType === "role" ? "Peran" : targetType === "cohort" ? "Angkatan" : "Rumah Sakit"}
                  </label>
                  <select className={selectClass} required value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                    <option value="">Pilih...</option>
                    {targetType === "role" && ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    {targetType === "cohort" && cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    {targetType === "hospital" && hospitals.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Judul</label>
              <Input required maxLength={255} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Isi Pesan</label>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                maxLength={5000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isSending} className="bg-blue-900 hover:bg-blue-800 text-white">
              <Send className="w-4 h-4 mr-2" /> {isSending ? "Mengirim..." : "Kirim Broadcast"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-white dark:bg-gray-900 overflow-x-auto">
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Judul</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Penerima</TableHead>
              <TableHead>Pengirim</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-10">Memuat...</TableCell></TableRow>
            ) : history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Megaphone className="w-10 h-10 text-slate-300" />
                    <p className="text-sm text-slate-500">Belum ada broadcast terkirim.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              history.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {new Date(row.created_at).toLocaleString("id-ID", {
                      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <span className="font-medium text-sm">{row.subject}</span>
                    <span className="block text-xs text-slate-400 line-clamp-1" title={row.body}>{row.body}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{targetSummary(row)}</TableCell>
                  <TableCell>
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {row.recipients_count}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{row.sender?.name || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
