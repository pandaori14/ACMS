"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  FileCheck2,
  Download,
  Loader2,
  RefreshCw,
  ShieldCheck,
  BookOpen,
  FileBadge,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
} from "lucide-react";
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
  meta?: {
    name?: string;
    average?: number | null;
    stase_count?: number;
    entry_count?: number;
    letter_number?: string;
  } | null;
}

interface EligibilityRequirement {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}

interface EligibilityResult {
  eligible: boolean;
  requirements: EligibilityRequirement[];
}

const STATUS_BADGE: Record<string, { labelKey: string; cls: string }> = {
  processing: { labelKey: "statusProcessing", cls: "bg-amber-100 text-amber-700" },
  ready: { labelKey: "statusReady", cls: "bg-emerald-100 text-emerald-700" },
  failed: { labelKey: "statusFailed", cls: "bg-red-100 text-red-700" },
};

const DOC_TYPE_KEY: Record<string, string> = {
  transcript: "docTranscript",
  logbook_book: "docLogbook",
  letter_active: "docLetterActive",
  letter_graduated: "docLetterGraduated",
};

export default function DocumentsPage() {
  const t = useTranslations("yudisiumDocuments");
  const tc = useTranslations("common");
  const user = useAuthStore((state) => state.user);
  const isStudent = user?.roles?.includes("Mahasiswa") ?? false;

  const [docs, setDocs] = useState<GeneratedDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);

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

  // Checklist kelayakan yudisium — hanya relevan untuk mahasiswa
  useEffect(() => {
    if (!isStudent) return;
    api
      .get("/api/v1/yudisium/eligibility")
      .then((res) => setEligibility(res.data.data))
      .catch(() => setEligibility(null));
  }, [isStudent]);

  // Polling ringan selama masih ada dokumen berstatus processing
  useEffect(() => {
    if (!docs.some((d) => d.status === "processing")) return;
    const t = setInterval(fetchDocs, 5000);
    return () => clearInterval(t);
  }, [docs, fetchDocs]);

  const handleGenerate = async (endpoint: string, key: string, body?: Record<string, string>) => {
    setGenerating(key);
    try {
      const res = await api.post(endpoint, body ?? {});
      toast.success(res.data.message);
      fetchDocs();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("generateError")));
    } finally {
      setGenerating(null);
    }
  };

  const docTypeLabel = (type: string) => (DOC_TYPE_KEY[type] ? t(DOC_TYPE_KEY[type]) : type);

  const docSummary = (doc: GeneratedDoc): string => {
    if (doc.type === "logbook_book" && doc.meta?.entry_count != null) {
      return t("summaryLogbook", { count: doc.meta.entry_count, stase: doc.meta.stase_count ?? "-" });
    }
    if (doc.type.startsWith("letter_") && doc.meta?.letter_number) {
      return t("summaryLetter", { number: doc.meta.letter_number });
    }
    if (doc.meta?.stase_count != null) {
      return t("summaryTranscript", { stase: doc.meta.stase_count, average: doc.meta.average ?? "-" });
    }
    return "-";
  };

  const handleDownload = async (doc: GeneratedDoc) => {
    toast.loading(t("downloading"), { id: "doc-dl" });
    try {
      const res = await api.get(`/api/v1/yudisium/documents/${doc.id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const prefix = docTypeLabel(doc.type).replace(/[.\s]+/g, "_");
      link.setAttribute("download", `${prefix}_${doc.verification_code.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success(t("downloaded"), { id: "doc-dl" });
    } catch {
      toast.error(t("downloadError"), { id: "doc-dl" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleGenerate("/api/v1/yudisium/generate", "transcript")}
            disabled={generating !== null}
            className="bg-blue-900 hover:bg-blue-800 text-white"
          >
            {generating === "transcript" ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("starting")}</>
            ) : (
              <><FileCheck2 className="w-4 h-4 mr-2" /> {t("btnTranscript")}</>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleGenerate("/api/v1/yudisium/generate-logbook-book", "logbook")}
            disabled={generating !== null}
          >
            {generating === "logbook" ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("starting")}</>
            ) : (
              <><BookOpen className="w-4 h-4 mr-2" /> {t("btnLogbook")}</>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              handleGenerate("/api/v1/yudisium/generate-letter", "letter", { letter_type: "active" })
            }
            disabled={generating !== null}
          >
            {generating === "letter" ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("starting")}</>
            ) : (
              <><FileBadge className="w-4 h-4 mr-2" /> {t("btnLetterActive")}</>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              handleGenerate("/api/v1/yudisium/generate-letter", "letter-grad", { letter_type: "graduated" })
            }
            disabled={generating !== null}
          >
            {generating === "letter-grad" ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("starting")}</>
            ) : (
              <><FileBadge className="w-4 h-4 mr-2" /> {t("btnLetterGraduated")}</>
            )}
          </Button>
        </div>
      </div>

      {/* Checklist kelayakan yudisium (mahasiswa) */}
      {isStudent && eligibility && (
        <Card className={`clean-card border-l-4 ${eligibility.eligible ? "border-l-emerald-600" : "border-l-amber-500"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className={`w-5 h-5 ${eligibility.eligible ? "text-emerald-600" : "text-amber-500"}`} />
              {t("eligibilityTitle")}:{" "}
              {eligibility.eligible ? t("eligibilityMet") : t("eligibilityNotMet")}
            </CardTitle>
            <CardDescription>
              {t("eligibilityDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {eligibility.requirements.map((req) => (
                <li key={req.key} className="flex items-start gap-2 text-sm">
                  {req.passed ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-none text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 mt-0.5 flex-none text-red-500" />
                  )}
                  <span>
                    <span className="font-medium">{req.label}</span>
                    <span className="block text-xs text-muted-foreground">{req.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="clean-card border-l-4 border-l-blue-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-900" /> {t("verifyTitle")}
          </CardTitle>
          <CardDescription>
            {t("verifyDesc")}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="rounded-md border bg-white dark:bg-gray-900 overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>{t("colCreatedAt")}</TableHead>
              <TableHead>{t("colType")}</TableHead>
              <TableHead>{t("colSummary")}</TableHead>
              <TableHead>{tc("status")}</TableHead>
              <TableHead className="text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-10">
                  {tc("loading")}
                </TableCell>
              </TableRow>
            ) : docs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <FileCheck2 className="w-10 h-10 text-slate-300" />
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">
                        {t("emptyTitle")}
                      </p>
                      <p className="text-sm text-slate-500">
                        {t("emptyDesc")}
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
                    <TableCell className="whitespace-nowrap">{docTypeLabel(doc.type)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{docSummary(doc)}</TableCell>
                    <TableCell>
                      <Badge className={badge.cls}>
                        {doc.status === "processing" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {t(badge.labelKey)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {doc.status === "ready" && (
                        <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                          <Download className="w-4 h-4 mr-1" /> {tc("download")}
                        </Button>
                      )}
                      {doc.status === "failed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (doc.type === "logbook_book") {
                              handleGenerate("/api/v1/yudisium/generate-logbook-book", "logbook");
                            } else if (doc.type.startsWith("letter_")) {
                              handleGenerate("/api/v1/yudisium/generate-letter", "letter", {
                                letter_type: doc.type.replace("letter_", ""),
                              });
                            } else {
                              handleGenerate("/api/v1/yudisium/generate", "transcript");
                            }
                          }}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" /> {t("retry")}
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
