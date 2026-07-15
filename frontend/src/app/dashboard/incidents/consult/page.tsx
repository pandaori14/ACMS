"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Info, CheckCircle2, Lock, Inbox, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import api from "@/lib/api";
import type { Consultation, ConsultationStatus } from "@/types/incident";

interface FormOption {
  value: string;
  name: string;
}

interface ConsultForm {
  category: string;
  topic: string;
  message: string;
  is_anonymous: boolean;
}

const EMPTY_FORM: ConsultForm = { category: "", topic: "", message: "", is_anonymous: false };

const CONSULT_STATUS_CLS: Record<ConsultationStatus, string> = {
  pending: "",
  in_progress: "bg-amber-500 text-white",
  responded: "bg-blue-600 text-white",
  closed: "bg-green-600 text-white",
};

export default function ConsultPage() {
  const t = useTranslations("incidentConsult");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [categories, setCategories] = useState<FormOption[]>([]);
  const [history, setHistory] = useState<Consultation[]>([]);
  const [formData, setFormData] = useState<ConsultForm>(EMPTY_FORM);

  const statusBadge = (status: ConsultationStatus) => {
    if (!t.has(`consultStatus.${status}`)) {
      return <Badge variant="outline">{status}</Badge>;
    }
    const label = t(`consultStatus.${status}`);
    if (status === "pending") return <Badge variant="destructive">{label}</Badge>;
    return <Badge className={CONSULT_STATUS_CLS[status]}>{label}</Badge>;
  };

  useEffect(() => {
    api.get("/api/v1/consultations/form-options")
      .then((res) => setCategories(res.data.data?.categories ?? []))
      .catch(() => {});
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/consultations");
      setHistory(res.data.data ?? []);
    } catch {
      // diamkan; riwayat opsional
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleChange = (field: keyof ConsultForm, value: string | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value ?? "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.topic || !formData.message) {
      toast.error(t("validationRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/v1/consultations", formData);
      toast.success(res.data.message ?? t("submitSuccess"));
      setIsSubmitted(true);
      fetchHistory();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      toast.error(e.response?.data?.error ?? e.response?.data?.message ?? t("submitError"));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setIsSubmitted(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-400 flex items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("subtitle")}
        </p>
      </div>

      {/* Form / Success */}
      {isSubmitted ? (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-blue-500 mb-4" />
            <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-400">{t("successTitle")}</h3>
            <p className="text-muted-foreground mt-4 text-lg">
              {t.rich("successBody", { b: (chunks) => <strong>{chunks}</strong> })}
            </p>
            <Button className="mt-8 bg-blue-900 hover:bg-blue-800 text-white" onClick={resetForm}>
              {t("sendAnother")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 p-4 rounded-lg flex gap-3 text-sm border border-blue-200 dark:border-blue-900">
            <Info className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              {t.rich("infoNotice", { b: (chunks) => <strong>{chunks}</strong> })}
            </p>
          </div>

          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>{t("detailTitle")}</CardTitle>
                <CardDescription>{t("detailDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="category">{t("categoryLabel")} <span className="text-red-500">*</span></Label>
                  <Select value={formData.category} onValueChange={(v) => handleChange("category", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("categoryPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topic">{t("topicLabel")} <span className="text-red-500">*</span></Label>
                  <Input
                    id="topic"
                    placeholder={t("topicPlaceholder")}
                    value={formData.topic}
                    onChange={(e) => handleChange("topic", e.target.value)}
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{t("messageLabel")} <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="message"
                    placeholder={t("messagePlaceholder")}
                    className="min-h-[200px] resize-y"
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground text-right">{formData.message.length}/3000</p>
                </div>

                {/* Anonymous Checkbox */}
                <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg border">
                  <input
                    type="checkbox"
                    id="is_anonymous"
                    checked={formData.is_anonymous}
                    onChange={(e) => handleChange("is_anonymous", e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="space-y-1">
                    <label htmlFor="is_anonymous" className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("anonLabel")}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {t("anonHint")}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 bg-muted/20 pt-6">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => window.history.back()}>{tc("cancel")}</Button>
                <Button type="submit" disabled={loading} className="bg-blue-900 hover:bg-blue-800 text-white w-full sm:w-auto">
                  {loading ? t("submitting") : t("submit")}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </>
      )}

      {/* Riwayat Konsultasi Saya */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
          <Inbox className="h-5 w-5" /> {t("historyTitle")}
        </h2>
        {history.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {t("historyEmpty")}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <details className="group">
                  <summary className="flex items-center justify-between gap-4 p-4 cursor-pointer list-none hover:bg-muted/30">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{c.topic}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(c.created_at), "dd MMM yyyy")}
                        {c.response ? ` · ${t("replyAvailable")}` : ` · ${t("awaitingReply")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {statusBadge(c.status)}
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
                  <div className="px-4 pb-4 space-y-3 border-t pt-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t("yourMessage")}</p>
                      <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{c.message}</p>
                    </div>
                    {c.response ? (
                      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md p-3">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1">{t("teamReply")}</p>
                        <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{c.response}</p>
                        {c.responded_at && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {c.responder?.name ? t("byLine", { name: c.responder.name }) : ""}{format(new Date(c.responded_at), "dd MMM yyyy, HH:mm")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">{t("processingReply")}</p>
                    )}
                  </div>
                </details>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
