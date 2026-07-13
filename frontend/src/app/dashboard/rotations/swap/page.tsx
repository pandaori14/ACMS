"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeftRight } from "lucide-react";
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

interface AssignmentInfo {
  id?: string;
  student?: { user?: { name?: string; identity_number?: string } } | null;
  stase?: { name?: string } | null;
  hospital?: { name?: string } | null;
}

interface SwapRow {
  id: string;
  reason: string;
  status: "submitted" | "approved" | "rejected" | "cancelled";
  decision_note?: string | null;
  created_at: string;
  requester_assignment?: AssignmentInfo | null;
  target_assignment?: AssignmentInfo | null;
  decider?: { name?: string } | null;
}

interface Candidate {
  assignment_id: string;
  student_name?: string;
  stase?: string;
  hospital?: string;
}

interface PeriodOption {
  id: string;
  name: string;
}

const STATUS_CLS: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

const pairLabel = (a?: AssignmentInfo | null) =>
  a ? `${a.student?.user?.name ?? "-"} — ${a.stase?.name ?? "-"} @ ${a.hospital?.name ?? "-"}` : "-";

/**
 * Tukar Jadwal Rotasi:
 * - Mahasiswa: ajukan tukar slot (stase+RS) dengan mahasiswa lain se-periode,
 *   pantau status, batalkan selagi menunggu.
 * - Admin rotasi (manage-rotations): tinjau & putuskan — disetujui = slot
 *   ditukar otomatis dan kedua mahasiswa diberi tahu.
 */
export default function RotationSwapPage() {
  const t = useTranslations("rotationSwap");
  const tc = useTranslations("common");
  const user = useAuthStore((state) => state.user);
  const isStudent = user?.roles?.includes("Mahasiswa") ?? false;
  const canDecide = user?.permissions?.includes("manage-rotations") ?? false;

  const [swaps, setSwaps] = useState<SwapRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pengajuan (mahasiswa)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Keputusan (admin)
  const [deciding, setDeciding] = useState<SwapRow | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [isDeciding, setIsDeciding] = useState(false);

  const fetchSwaps = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/v1/rotation/swaps");
      setSwaps(res.data.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("loadError")));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSwaps();
    if (isStudent) {
      api.get("/api/v1/rotation/periods").then((res) => setPeriods(res.data.data || res.data)).catch(() => {});
    }
  }, [fetchSwaps, isStudent]);

  const loadCandidates = async (pid: string) => {
    setPeriodId(pid);
    setTargetId("");
    if (!pid) return;
    try {
      const res = await api.get("/api/v1/rotation/swaps/candidates", {
        params: { rotation_period_id: pid },
      });
      setCandidates(res.data.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("candidatesError")));
    }
  };

  const submitSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.post("/api/v1/rotation/swaps", {
        target_assignment_id: targetId,
        reason,
      });
      toast.success(res.data.message);
      setIsFormOpen(false);
      setReason("");
      fetchSwaps();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("submitError")));
    } finally {
      setIsSaving(false);
    }
  };

  const cancelSwap = async (swap: SwapRow) => {
    try {
      await api.patch(`/api/v1/rotation/swaps/${swap.id}/cancel`);
      toast.success(t("cancelledToast"));
      fetchSwaps();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("cancelError")));
    }
  };

  const decide = async (decision: "approved" | "rejected") => {
    if (!deciding) return;
    setIsDeciding(true);
    try {
      const res = await api.patch(`/api/v1/rotation/swaps/${deciding.id}/decide`, {
        decision,
        decision_note: decisionNote || null,
      });
      toast.success(res.data.message);
      setDeciding(null);
      fetchSwaps();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("decideError")));
    } finally {
      setIsDeciding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {isStudent ? t("subtitleStudent") : t("subtitleAdmin")}
          </p>
        </div>
        {isStudent && (
          <Button onClick={() => setIsFormOpen(true)} className="bg-blue-900 hover:bg-blue-800 text-white">
            <ArrowLeftRight className="w-4 h-4 mr-2" /> {t("requestSwap")}
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-white dark:bg-gray-900 overflow-x-auto">
        <Table className="min-w-[820px]">
          <TableHeader>
            <TableRow>
              <TableHead>{tc("date")}</TableHead>
              <TableHead>{t("colRequester")}</TableHead>
              <TableHead>{t("colPartner")}</TableHead>
              <TableHead>{t("colReason")}</TableHead>
              <TableHead>{tc("status")}</TableHead>
              <TableHead className="text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-10">{tc("loading")}</TableCell></TableRow>
            ) : swaps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <ArrowLeftRight className="w-10 h-10 text-slate-300" />
                    <p className="text-sm text-slate-500">{t("empty")}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              swaps.map((swap) => {
                return (
                  <TableRow key={swap.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(swap.created_at).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell className="text-sm">{pairLabel(swap.requester_assignment)}</TableCell>
                    <TableCell className="text-sm">{pairLabel(swap.target_assignment)}</TableCell>
                    <TableCell className="max-w-[220px]">
                      <span className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2" title={swap.reason}>
                        {swap.reason}
                      </span>
                      {swap.decision_note && (
                        <span className="block text-xs text-slate-400 mt-0.5">{t("noteLabel")}: {swap.decision_note}</span>
                      )}
                    </TableCell>
                    <TableCell><Badge className={STATUS_CLS[swap.status]}>{t(`status.${swap.status}`)}</Badge></TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {swap.status === "submitted" && canDecide && (
                        <Button
                          size="sm"
                          className="bg-blue-900 hover:bg-blue-800 text-white"
                          onClick={() => { setDeciding(swap); setDecisionNote(""); }}
                        >
                          {t("review")}
                        </Button>
                      )}
                      {swap.status === "submitted" && isStudent && (
                        <Button variant="outline" size="sm" onClick={() => cancelSwap(swap)}>
                          {t("cancelBtn")}
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

      {/* Dialog pengajuan (mahasiswa) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("formTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitSwap} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("periodLabel")}</label>
              <select className={selectClass} required value={periodId} onChange={(e) => loadCandidates(e.target.value)}>
                <option value="">{t("selectPeriod")}</option>
                {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("swapWith")}</label>
              <select className={selectClass} required value={targetId} onChange={(e) => setTargetId(e.target.value)} disabled={!periodId}>
                <option value="">{t("selectTarget")}</option>
                {candidates.map((c) => (
                  <option key={c.assignment_id} value={c.assignment_id}>
                    {c.student_name} — {c.stase} @ {c.hospital}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {t("swapHint")}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("reasonLabel")}</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                minLength={10}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSaving || !targetId}>
              {isSaving ? t("sending") : t("sendRequest")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog keputusan (admin) */}
      <Dialog open={!!deciding} onOpenChange={(open) => !open && setDeciding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reviewTitle")}</DialogTitle>
          </DialogHeader>
          <Card className="border-dashed">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">
                {pairLabel(deciding?.requester_assignment)}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" /> {pairLabel(deciding?.target_assignment)}
              </CardDescription>
            </CardHeader>
          </Card>
          <p className="text-sm text-slate-600 dark:text-slate-300">{deciding?.reason}</p>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("decisionNoteLabel")}</label>
            <textarea
              className="flex min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              maxLength={1000}
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" disabled={isDeciding} onClick={() => decide("rejected")}>
              {t("reject")}
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isDeciding}
              onClick={() => decide("approved")}
            >
              {isDeciding ? tc("processing") : t("approveSwap")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
