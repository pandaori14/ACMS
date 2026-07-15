"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ShieldAlert, Info, CheckCircle2, Paperclip, Eye, ArrowRight, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import type { IncidentFormOptions } from "@/types/incident";
import type { ActiveFormTemplate } from "@/types/incident-form";
import DynamicIncidentForm from "./DynamicIncidentForm";

interface FormState {
  incident_date: string;
  location: string;
  description: string;
  involved_parties: string;
  is_anonymous: boolean;
  severity: string;
}

const EMPTY_FORM: FormState = {
  incident_date: "",
  location: "",
  description: "",
  involved_parties: "",
  is_anonymous: false,
  severity: "",
};

interface IncidentReportFormProps {
  /** Mode preview untuk konfigurator: read-only, tidak mengirim ke server. */
  previewMode?: boolean;
}

export default function IncidentReportForm({ previewMode = false }: IncidentReportFormProps) {
  const t = useTranslations("incidentReport");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [options, setOptions] = useState<IncidentFormOptions | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [selectedIncidentType, setSelectedIncidentType] = useState<string>("");
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    api.get("/api/v1/incidents/form-options")
      .then((res) => setOptions(res.data.data))
      .catch(() => {});
  }, []);

  const disabled = previewMode;
  const allowedTypes = options?.attachment.allowed_types ?? "jpg,jpeg,png,pdf,doc,docx";
  const maxSizeMb = options?.attachment.max_size_mb ?? 10;
  const acceptAttr = allowedTypes.split(",").map((ext) => `.${ext.trim()}`).join(",");

  const handleChange = (field: keyof FormState, value: string | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value ?? "" }));
  };

  const handleNextStep = () => {
    if (!selectedIncidentType) {
      toast.error(t("selectTypeFirst"));
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setFormData(EMPTY_FORM);
    setAttachmentFile(null);
    setIsSubmitted(false);
  };

  const handleSubmitStatic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previewMode) return;

    if (!formData.incident_date || !formData.location || !formData.description) {
      toast.error(t("validationRequired"));
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("incident_type", selectedIncidentType);
      fd.append("incident_date", formData.incident_date);
      fd.append("location", formData.location);
      fd.append("description", formData.description);
      if (formData.involved_parties) fd.append("involved_parties", formData.involved_parties);
      fd.append("is_anonymous", formData.is_anonymous ? "1" : "0");
      if (formData.severity) fd.append("severity", formData.severity);
      if (attachmentFile) fd.append("attachment", attachmentFile);

      const res = await api.post("/api/v1/incidents/report", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data.message ?? t("submitSuccess"));
      setIsSubmitted(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      toast.error(e.response?.data?.error ?? e.response?.data?.message ?? t("submitError"));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedIncidentType("");
    setFormData(EMPTY_FORM);
    setAttachmentFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsSubmitted(false);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pt-10">
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">{t("successTitle")}</h3>
            <p className="text-muted-foreground mt-4 text-lg">
              {t("successBody")}
            </p>
            <Button className="mt-8" onClick={resetForm}>
              {t("sendAnother")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeTemplate: ActiveFormTemplate | null = options?.form_templates?.[selectedIncidentType] ?? null;

  // Step 1: Pilih Jenis Insiden
  if (step === 1) {
    return (
      <div className={previewMode ? "" : "max-w-3xl mx-auto space-y-6 pb-12"}>
        {!previewMode && (
          <>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-red-700 dark:text-red-400 flex items-center gap-2">
                <ShieldAlert className="h-8 w-8" />
                {t("pageTitle")}
              </h1>
              <p className="text-muted-foreground mt-2">
                {t("step1Subtitle")}
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 p-4 rounded-lg flex gap-3 text-sm border border-blue-200 dark:border-blue-900">
              <Info className="h-5 w-5 shrink-0 mt-0.5" />
              <p>
                {t("step1Notice")}
              </p>
            </div>
          </>
        )}

        {previewMode && (
          <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 p-4 rounded-lg flex gap-3 text-sm border border-amber-200 dark:border-amber-900 mb-4">
            <Eye className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              {t.rich("step1PreviewNotice", { b: (chunks) => <strong>{chunks}</strong> })}
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("step1CardTitle")}</CardTitle>
            <CardDescription>{t("step1CardDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-w-xl">
              <Label htmlFor="incident_type" className="text-base">{t("categoryLabel")} <span className="text-red-500">*</span></Label>
              <Select value={selectedIncidentType} onValueChange={(v) => setSelectedIncidentType(v || "")} disabled={disabled}>
                <SelectTrigger className="w-full h-12 text-base">
                  <SelectValue placeholder={t("step1TypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {(options?.incident_types ?? []).map((type) => (
                    <SelectItem key={type.value} value={type.value} className="py-3 cursor-pointer">
                      <div className="font-medium">{type.name}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/20 pt-6">
            <Button
              type="button"
              onClick={handleNextStep}
              disabled={!selectedIncidentType || disabled}
              className="ml-auto bg-blue-600 hover:bg-blue-700"
            >
              {t("continueButton")} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Step 2 (Dynamic Template)
  if (activeTemplate) {
    return (
      <div className={previewMode ? "" : "max-w-3xl mx-auto space-y-6 pb-12"}>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={handleBack} disabled={loading || disabled}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {tc("back")}
          </Button>
        </div>
        <DynamicIncidentForm
          template={activeTemplate}
          incidentType={selectedIncidentType}
          previewMode={previewMode}
          onSubmitSuccess={resetForm} // DynamicIncidentForm has its own success screen, but if it calls this, we reset
        />
      </div>
    );
  }

  // Step 2 (Static Fallback Form)
  return (
    <div className={previewMode ? "" : "max-w-3xl mx-auto space-y-6 pb-12"}>
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={handleBack} disabled={loading || disabled}>
          <ArrowLeft className="h-4 w-4 mr-2" /> {tc("back")}
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSubmitStatic}>
          <CardHeader>
            <CardTitle>
              {t("detailTitleFor", {
                type: (options?.incident_types ?? []).find((type) => type.value === selectedIncidentType)?.name ?? "",
              })}
            </CardTitle>
            <CardDescription>{t("detailDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="incident_date">{t("dateLabel")} <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  id="incident_date"
                  value={formData.incident_date}
                  onChange={(e) => handleChange("incident_date", e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity">{t("severityLabel")}</Label>
                <Select value={formData.severity} onValueChange={(v) => handleChange("severity", v)} disabled={disabled}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("severityPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(options?.incident_severities ?? []).map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{t("locationLabel")} <span className="text-red-500">*</span></Label>
              <Input
                id="location"
                placeholder={t("locationPlaceholder")}
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="involved_parties">{t("involvedLabel")}</Label>
              <Input
                id="involved_parties"
                placeholder={t("involvedPlaceholder")}
                value={formData.involved_parties}
                onChange={(e) => handleChange("involved_parties", e.target.value)}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("chronologyLabel")} <span className="text-red-500">*</span></Label>
              <Textarea
                id="description"
                placeholder={t("chronologyPlaceholder")}
                className="min-h-[150px] resize-y"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                disabled={disabled}
              />
            </div>

            {/* File Attachment */}
            <div className="space-y-2">
              <Label htmlFor="attachment">{t("attachmentLabel")}</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  {attachmentFile ? attachmentFile.name : t("chooseFile")}
                </Button>
                {attachmentFile && !disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAttachmentFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    {t("removeFile")}
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                id="attachment"
                className="hidden"
                accept={acceptAttr}
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                {t("formatHint", { types: allowedTypes.toUpperCase().replace(/,/g, ", "), max: maxSizeMb })}
              </p>
            </div>

            {/* Anonymous Checkbox */}
            <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg border">
              <input
                type="checkbox"
                id="is_anonymous"
                checked={formData.is_anonymous}
                onChange={(e) => handleChange("is_anonymous", e.target.checked)}
                className="h-4 w-4 mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                disabled={disabled}
              />
              <div className="space-y-1">
                <label htmlFor="is_anonymous" className="text-sm font-medium leading-none cursor-pointer">
                  {t("anonLabel")}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t("anonHint")}
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 bg-muted/20 pt-6">
            {!previewMode && (
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleBack}>{tc("cancel")}</Button>
            )}
            <Button type="submit" disabled={loading || disabled} className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto sm:ml-auto">
              {loading ? t("submitting") : t("submit")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
