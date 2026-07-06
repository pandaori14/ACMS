"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Scale } from "lucide-react";
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

interface AppealRow {
  id: string;
  reason: string;
  status: "submitted" | "accepted" | "rejected";
  decision_note?: string | null;
  decided_at?: string | null;
  created_at: string;
  student?: { name?: string; identity_number?: string } | null;
  reviewer?: { name?: string } | null;
  stase_grade?: {
    final_score?: string | number | null;
    letter_grade?: string | null;
    rotation_assignment?: { stase?: { name?: string } | null } | null;
  } | null;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  submitted: { label: "Menunggu", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  accepted: { label: "Diterima", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  rejected: { label: "Ditolak", cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

/**
 * Peninjauan banding nilai (manage-grades): diterima → nilai dibuka kembali
 * ke approved untuk dikoreksi & diterbitkan ulang; ditolak → nilai tetap.
 */
export default function GradeAppealsPage() {
  const [appeals, setAppeals] = useState<AppealRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [target, setTarget] = useState<AppealRow | null>(null);
  const [decision, setDecision] = useState<"accepted" | "rejected">("accepted");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchAppeals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/v1/grades/appeals");
      setAppeals(res.data.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memuat daftar banding."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppeals();
  }, [fetchAppeals]);

  const decide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setIsSaving(true);
    try {
      const res = await api.patch(`/api/v1/grades/appeals/${target.id}/decide`, {
        decision,
        decision_note: note,
      });
      toast.success(res.data.message);
      setTarget(null);
      fetchAppeals();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan keputusan."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Banding Nilai</h1>
        <p className="text-muted-foreground mt-1">
          Keberatan nilai dari mahasiswa. Banding yang <span className="font-medium">diterima</span>{" "}
          membuka kembali nilai (status approved) untuk dikoreksi lalu diterbitkan ulang.
        </p>
      </div>

      <div className="rounded-md border bg-white dark:bg-gray-900 overflow-x-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Mahasiswa</TableHead>
              <TableHead>Stase</TableHead>
              <TableHead>Nilai</TableHead>
              <TableHead>Alasan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-10">Memuat...</TableCell>
              </TableRow>
            ) : appeals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Scale className="w-10 h-10 text-slate-300" />
                    <p className="text-sm text-slate-500">Tidak ada banding nilai.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              appeals.map((row) => {
                const badge = STATUS_BADGE[row.status];
                return (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(row.created_at).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.student?.name}
                      <span className="block text-xs text-slate-400">{row.student?.identity_number}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.stase_grade?.rotation_assignment?.stase?.name || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.stase_grade?.final_score ?? "-"} ({row.stase_grade?.letter_grade ?? "-"})
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <span className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2" title={row.reason}>
                        {row.reason}
                      </span>
                      {row.decision_note && (
                        <span className="block text-xs text-slate-400 mt-0.5" title={row.decision_note}>
                          Keputusan: {row.decision_note}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={badge.cls}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {row.status === "submitted" && (
                        <Button
                          size="sm"
                          className="bg-blue-900 hover:bg-blue-800 text-white"
                          onClick={() => {
                            setTarget(row);
                            setDecision("accepted");
                            setNote("");
                          }}
                        >
                          Tinjau
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

      {/* Dialog keputusan */}
      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Tinjau Banding — {target?.student?.name} (
              {target?.stase_grade?.rotation_assignment?.stase?.name})
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={decide} className="space-y-4 pt-2">
            <div className="rounded-md border bg-slate-50 dark:bg-slate-900 p-3 text-sm text-slate-700 dark:text-slate-200">
              {target?.reason}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Keputusan</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={decision === "accepted" ? "default" : "outline"}
                  className={decision === "accepted" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                  onClick={() => setDecision("accepted")}
                >
                  Terima (buka nilai)
                </Button>
                <Button
                  type="button"
                  variant={decision === "rejected" ? "default" : "outline"}
                  className={decision === "rejected" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                  onClick={() => setDecision("rejected")}
                >
                  Tolak
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Catatan keputusan (dikirim ke mahasiswa)</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                minLength={5}
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setTarget(null)}>Batal</Button>
              <Button type="submit" disabled={isSaving} className="bg-blue-900 hover:bg-blue-800 text-white">
                {isSaving ? "Menyimpan..." : "Simpan Keputusan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
