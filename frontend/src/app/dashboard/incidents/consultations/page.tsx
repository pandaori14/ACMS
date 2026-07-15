"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { MessageSquareDot, RefreshCw, Eye, UserX, Clock, CheckCircle2, MessageSquare } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import type { Consultation, ConsultationStatus } from "@/types/incident";

const CONSULT_STATUS_CLS: Record<ConsultationStatus, string> = {
  pending: "",
  in_progress: "bg-amber-500 text-white",
  responded: "bg-blue-600 text-white",
  closed: "bg-green-600 text-white",
};

export default function ConsultationsPage() {
  const t = useTranslations("incidentConsultations");
  const tc = useTranslations("common");
  const router = useRouter();
  const permissions = useAuthStore((s) => s.user?.permissions) ?? [];
  const canManage = permissions.includes("manage-consultations");

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, responded: 0 });

  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [responseText, setResponseText] = useState("");
  const [responseStatus, setResponseStatus] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Kategori konsultasi dikonfigurasi via system_references → fallback ke nilai mentah.
  const categoryLabel = (category: string) =>
    t.has(`category.${category}`) ? t(`category.${category}`) : category;

  const getStatusBadge = (status: ConsultationStatus) => {
    if (!t.has(`consultStatus.${status}`)) {
      return <Badge variant="outline">{status}</Badge>;
    }
    const label = t(`consultStatus.${status}`);
    if (status === "pending") return <Badge variant="destructive">{label}</Badge>;
    return <Badge className={CONSULT_STATUS_CLS[status]}>{label}</Badge>;
  };

  useEffect(() => {
    if (!canManage) {
      router.replace("/dashboard");
    }
  }, [canManage, router]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await api.get("/api/v1/consultations", { params });
      const data: Consultation[] = res.data.data;
      setConsultations(data);
      setStats({
        total: res.data.meta?.total ?? data.length,
        pending: data.filter((c) => c.status === "pending").length,
        responded: data.filter((c) => c.status === "responded").length,
      });
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    if (canManage) fetchData();
  }, [fetchData, canManage]);

  const handleOpenDetail = (c: Consultation) => {
    setSelected(c);
    setResponseText(c.response ?? "");
    setResponseStatus(c.status === "pending" ? "in_progress" : c.status === "in_progress" ? "responded" : "");
    setDialogOpen(true);
  };

  const handleRespond = async () => {
    if (!selected || !responseText.trim() || !responseStatus) return;
    setSubmitting(true);
    try {
      await api.patch(`/api/v1/consultations/${selected.id}/respond`, {
        response: responseText,
        status: responseStatus,
      });
      toast.success(t("respondSuccess"));
      setDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? t("respondError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManage) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-400 flex items-center gap-2">
            <MessageSquareDot className="h-8 w-8" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="clean-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("cardTotal")}</CardTitle>
            <MessageSquare className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("cardTotalSub")}</p>
          </CardContent>
        </Card>
        <Card className="clean-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("cardPending")}</CardTitle>
            <Clock className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-red-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("cardPendingSub")}</p>
          </CardContent>
        </Card>
        <Card className="clean-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("cardResponded")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-blue-600">{stats.responded}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("cardRespondedSub")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t("filterAllStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllStatus")}</SelectItem>
            <SelectItem value="pending">{t("consultStatus.pending")}</SelectItem>
            <SelectItem value="in_progress">{t("consultStatus.in_progress")}</SelectItem>
            <SelectItem value="responded">{t("consultStatus.responded")}</SelectItem>
            <SelectItem value="closed">{t("consultStatus.closed")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border border-muted/50 overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm text-left">
          <thead className="bg-muted/50 text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">{tc("date")}</th>
              <th className="px-4 py-3 whitespace-nowrap">{t("colCategory")}</th>
              <th className="px-4 py-3 whitespace-nowrap">{t("colTopic")}</th>
              <th className="px-4 py-3 whitespace-nowrap">{t("colRequester")}</th>
              <th className="px-4 py-3 whitespace-nowrap">{tc("status")}</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">{tc("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t("loadingData")}</td>
              </tr>
            ) : consultations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t("empty")}</td>
              </tr>
            ) : (
              consultations.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                    {format(new Date(c.created_at), "dd MMM yyyy")}
                  </td>
                  <td className="px-4 py-3">{categoryLabel(c.category)}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate font-medium">{c.topic}</td>
                  <td className="px-4 py-3">
                    {c.is_anonymous ? (
                      <span className="flex items-center text-muted-foreground gap-1 italic text-xs">
                        <UserX className="h-3.5 w-3.5" /> {t("anonymous")}
                      </span>
                    ) : (
                      c.requester?.name ?? "—"
                    )}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(c.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDetail(c)}>
                      <Eye className="h-4 w-4 mr-1" />
                      {c.status === "pending" || c.status === "in_progress" ? t("respondAction") : t("detailAction")}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail / Respond Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareDot className="h-5 w-5 text-blue-600" />
              {t("dialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {selected && `${categoryLabel(selected.category)} — ${format(new Date(selected.created_at), "dd MMM yyyy")}`}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 py-4">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{tc("status")}</p>
                  {getStatusBadge(selected.status)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t("colRequester")}</p>
                  {selected.is_anonymous ? (
                    <span className="flex items-center gap-1 italic text-muted-foreground"><UserX className="h-3.5 w-3.5" /> {t("anonymous")}</span>
                  ) : (
                    <span className="font-medium">{selected.requester?.name ?? "—"}</span>
                  )}
                </div>
              </div>

              {/* Topic */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t("colTopic")}</p>
                <p className="font-medium">{selected.topic}</p>
              </div>

              {/* Message */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t("metaMessage")}</p>
                <div className="bg-muted/30 p-3 rounded-md text-sm whitespace-pre-wrap">{selected.message}</div>
              </div>

              {/* Existing response */}
              {selected.response && (
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t("metaResponse")}</p>
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md text-sm whitespace-pre-wrap">
                    {selected.response}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {t("answeredByLabel")} <span className="font-medium">{selected.responder?.name ?? "—"}</span>
                    {selected.responded_at && ` · ${format(new Date(selected.responded_at), "dd MMM yyyy, HH:mm")}`}
                  </p>
                </div>
              )}

              {/* Response form (admin, not closed) */}
              {selected.status !== "closed" && (
                <div className="border-t pt-4 space-y-3">
                  <Label className="text-sm font-semibold">
                    {selected.response ? t("updateResponse") : t("addResponse")}
                  </Label>
                  <Textarea
                    placeholder={t("responsePlaceholder")}
                    className="min-h-[120px]"
                    value={responseText ?? ""}
                    onChange={(e) => setResponseText(e.target.value)}
                  />
                  <div className="space-y-2">
                    <Label className="text-sm">{t("statusAfterLabel")}</Label>
                    <Select value={responseStatus} onValueChange={(v) => setResponseStatus(v ?? "")}>
                      <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue placeholder={t("selectStatusPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {(selected.status === "pending" || selected.status === "in_progress") && (
                          <SelectItem value="in_progress">{t("statusOptionInProgress")}</SelectItem>
                        )}
                        <SelectItem value="responded">{t("statusOptionResponded")}</SelectItem>
                        <SelectItem value="closed">{t("statusOptionClosed")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>{tc("close")}</Button>
            {selected?.status !== "closed" && (
              <Button
                onClick={handleRespond}
                disabled={!responseText.trim() || !responseStatus || submitting}
                className="bg-blue-900 hover:bg-blue-800 text-white"
              >
                {submitting ? tc("saving") : t("saveResponse")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
