"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  CheckCircle2, Paperclip, Eye, ShieldAlert,
  User, AlertTriangle, Stethoscope, FileText,
  MessageSquare, Clock, MapPin, Phone, Mail,
  type LucideIcon,
} from "lucide-react";
import api from "@/lib/api";
import type { ActiveFormTemplate, FormSection, FormField, FieldType } from "@/types/incident-form";

// ─────────────────────────────────────────────────
//  Lucide icon resolver
// ─────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  user: User,
  "alert-triangle": AlertTriangle,
  stethoscope: Stethoscope,
  "file-text": FileText,
  "message-square": MessageSquare,
  clock: Clock,
  "map-pin": MapPin,
  phone: Phone,
  mail: Mail,
  "shield-alert": ShieldAlert,
};

function resolveIcon(name: string | null): LucideIcon | null {
  if (!name) return null;
  return ICON_MAP[name] ?? null;
}

// ─────────────────────────────────────────────────
//  Props
// ─────────────────────────────────────────────────

interface DynamicIncidentFormProps {
  /** Template aktif (dari form-options API). */
  template: ActiveFormTemplate;
  /** Jenis insiden yang dipilih user. */
  incidentType: string;
  /** Mode preview: read-only, tidak submit. */
  previewMode?: boolean;
  /** Callback setelah submit berhasil. */
  onSubmitSuccess?: () => void;
}

// ─────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────

export default function DynamicIncidentForm({
  template,
  incidentType,
  previewMode = false,
  onSubmitSuccess,
}: DynamicIncidentFormProps) {
  const t = useTranslations("incidentReport");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string | string[]>>({});
  const [fileValues, setFileValues] = useState<Record<string, File | null>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const disabled = previewMode;

  // Flatten all fields for conditional logic lookup
  const allFields = useMemo(() => {
    const fields: FormField[] = [];
    template.sections.forEach((s) => s.fields.forEach((f) => fields.push(f)));
    return fields;
  }, [template]);

  // ─── Value Handlers ────────────────────────────

  const setValue = useCallback((fieldKey: string, value: string | string[]) => {
    setFormValues((prev) => ({ ...prev, [fieldKey]: value }));
  }, []);

  const getValue = useCallback(
    (fieldKey: string): string | string[] => formValues[fieldKey] ?? "",
    [formValues]
  );

  // ─── Conditional Visibility ────────────────────

  const isSectionVisible = useCallback(
    (section: FormSection): boolean => {
      if (!section.is_visible) return false;
      if (!section.conditional_field_id || !section.conditional_value) return true;

      // Cari field_key dari conditional_field_id
      const condField = allFields.find((f) => f.id === section.conditional_field_id);
      if (!condField) return true;

      const currentVal = formValues[condField.field_key];
      if (Array.isArray(currentVal)) {
        return currentVal.includes(section.conditional_value);
      }
      return currentVal === section.conditional_value;
    },
    [allFields, formValues]
  );

  // ─── Submit ────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previewMode) return;

    // Client-side required validation
    for (const section of template.sections) {
      if (!isSectionVisible(section)) continue;
      for (const field of section.fields) {
        if (field.is_required) {
          const val = formValues[field.field_key];
          const file = fileValues[field.field_key];
          const isEmpty =
            field.field_type === "file"
              ? !file
              : field.field_type === "statement"
                ? val !== "true"
                : !val || (Array.isArray(val) && val.length === 0);

          if (isEmpty) {
            toast.error(t("fieldRequired", { label: field.label }));
            return;
          }
        }
      }
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("incident_type", incidentType);
      fd.append("form_template_id", template.id);

      // Semua jawaban form dinamis — field standar incident_report diambil dari form_answers juga
      // Cari field dengan key tertentu untuk field standar
      const descField = allFields.find((f) => f.field_key === "description" || f.field_key === "kronologi_insiden" || f.field_key === "uraian_kejadian");
      const dateField = allFields.find((f) => f.field_type === "date" || f.field_type === "datetime");
      const locationField = allFields.find((f) => f.field_key === "location" || f.field_key === "lokasi_kejadian");

      // Field standar incident_reports yang wajib
      fd.append("incident_date", dateField ? String(formValues[dateField.field_key] ?? new Date().toISOString().split("T")[0]) : new Date().toISOString().split("T")[0]);
      fd.append("location", locationField ? String(formValues[locationField.field_key] ?? "-") : "-");
      
      const rawDesc = descField ? String(formValues[descField.field_key] ?? "") : "";
      const finalDesc = rawDesc.length >= 20 ? rawDesc : (rawDesc + " (Dilaporkan via form dinamis, lihat jawaban lengkap)").padEnd(25, ".");
      fd.append("description", finalDesc);
      
      fd.append("is_anonymous", "0");

      // Semua form answers
      for (const [key, val] of Object.entries(formValues)) {
        if (Array.isArray(val)) {
          fd.append(`form_answers[${key}]`, JSON.stringify(val));
        } else {
          fd.append(`form_answers[${key}]`, val);
        }
      }

      // File uploads
      for (const [key, file] of Object.entries(fileValues)) {
        if (file) {
          fd.append(`form_files[${key}]`, file);
        }
      }

      const res = await api.post("/api/v1/incidents/report", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data.message ?? t("submitSuccess"));
      setIsSubmitted(true);
      onSubmitSuccess?.();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      toast.error(e.response?.data?.error ?? e.response?.data?.message ?? t("submitError"));
    } finally {
      setLoading(false);
    }
  };

  // ─── Success State ─────────────────────────────

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pt-10">
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">{t("dynSuccessTitle")}</h3>
            <p className="text-muted-foreground mt-4 text-lg">
              {t("dynSuccessBody")}
            </p>
            <Button
              className="mt-8"
              onClick={() => {
                setFormValues({});
                setFileValues({});
                setIsSubmitted(false);
              }}
            >
              {t("dynSendNew")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Theme Color ───────────────────────────────

  const themeColor = template.theme_color || "#1E3A8A";

  // ─── Render ────────────────────────────────────

  return (
    <div className={previewMode ? "" : "max-w-3xl mx-auto space-y-6 pb-12"}>
      {/* Header */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div
          className="px-6 py-10 text-center text-white"
          style={{ background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}cc 100%)` }}
        >
          <h2 className="text-2xl font-bold tracking-tight">{template.header_title}</h2>
          {template.header_subtitle && (
            <p className="mt-2 text-white/80 text-sm">{template.header_subtitle}</p>
          )}
        </div>
      </Card>

      {previewMode && (
        <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 p-4 rounded-lg flex gap-3 text-sm border border-amber-200 dark:border-amber-900">
          <Eye className="h-5 w-5 shrink-0 mt-0.5" />
          <p>
            {t.rich("dynPreviewNotice", { b: (chunks) => <strong>{chunks}</strong> })}
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {template.sections.map((section) => {
          if (!isSectionVisible(section)) return null;

          const IconComponent = resolveIcon(section.icon);

          return (
            <Card key={section.id} className="mb-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2" style={{ color: themeColor }}>
                  {IconComponent && <IconComponent className="h-5 w-5" />}
                  {section.title}
                </CardTitle>
                {section.description && (
                  <CardDescription>{section.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  {section.fields.map((field) => (
                    <div
                      key={field.id}
                      className={field.grid_cols === 2 ? "col-span-1" : "col-span-1 md:col-span-2"}
                    >
                      <FieldRenderer
                        field={field}
                        value={getValue(field.field_key)}
                        onChange={(v) => setValue(field.field_key, v)}
                        fileValue={fileValues[field.field_key] ?? null}
                        onFileChange={(f) => setFileValues((prev) => ({ ...prev, [field.field_key]: f }))}
                        fileRef={(el) => { fileRefs.current[field.field_key] = el; }}
                        disabled={disabled}
                        themeColor={themeColor}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Submit */}
        <CardFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-2 px-0">
          {!previewMode && (
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => window.history.back()}>
              {tc("cancel")}
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading || disabled}
            className="w-full sm:w-auto sm:ml-auto text-white"
            style={{ backgroundColor: themeColor }}
          >
            {loading ? t("submitting") : t("dynSubmit")}
          </Button>
        </CardFooter>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────
//  Field Renderer
// ─────────────────────────────────────────────────

interface FieldRendererProps {
  field: FormField;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  fileValue: File | null;
  onFileChange: (file: File | null) => void;
  fileRef: (el: HTMLInputElement | null) => void;
  disabled: boolean;
  themeColor: string;
}

function FieldRenderer({ field, value, onChange, fileValue, onFileChange, fileRef, disabled, themeColor }: FieldRendererProps) {
  const t = useTranslations("incidentReport");

  const renderField = (): React.ReactNode => {
    switch (field.field_type as FieldType) {
      case "text":
      case "email":
      case "tel":
        return (
          <Input
            type={field.field_type}
            placeholder={field.placeholder ?? ""}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        );

      case "textarea":
        return (
          <Textarea
            placeholder={field.placeholder ?? ""}
            className="min-h-[120px] resize-y"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        );

      case "date":
        return (
          <Input
            type="date"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            disabled={disabled}
          />
        );

      case "datetime":
        return (
          <Input
            type="datetime-local"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        );

      case "select":
        return (
          <Select
            value={typeof value === "string" ? value : ""}
            onValueChange={(v) => onChange(v || "")}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={field.placeholder ?? t("selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multiselect": {
        const selectedValues = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="space-y-2">
            <Select
              value=""
              onValueChange={(v) => {
                if (v && !selectedValues.includes(v)) {
                  onChange([...selectedValues, v]);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={field.placeholder ?? t("multiselectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {(field.options ?? [])
                  .filter((opt) => !selectedValues.includes(opt.value))
                  .map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedValues.map((sv) => {
                  const opt = (field.options ?? []).find((o) => o.value === sv);
                  return (
                    <span
                      key={sv}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border"
                      style={{ borderColor: themeColor, color: themeColor }}
                    >
                      {opt?.label ?? sv}
                      {!disabled && (
                        <button
                          type="button"
                          className="ml-1 hover:opacity-70"
                          onClick={() => onChange(selectedValues.filter((x) => x !== sv))}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case "checkbox": {
        const checkedValues = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {(field.options ?? []).map((opt) => (
              <label
                key={opt.value}
                className="flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checkedValues.includes(opt.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...checkedValues, opt.value]);
                    } else {
                      onChange(checkedValues.filter((v) => v !== opt.value));
                    }
                  }}
                  disabled={disabled}
                  className="h-4 w-4 mt-0.5 rounded border-gray-300"
                  style={{ accentColor: themeColor }}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        );
      }

      case "radio":
        return (
          <div className="space-y-2 mt-1">
            {(field.options ?? []).map((opt) => (
              <label
                key={opt.value}
                className="flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <input
                  type="radio"
                  name={field.field_key}
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  disabled={disabled}
                  className="h-4 w-4 mt-0.5"
                  style={{ accentColor: themeColor }}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        );

      case "file":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const ref = document.getElementById(`file-${field.field_key}`) as HTMLInputElement;
                  ref?.click();
                }}
                disabled={disabled}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                {fileValue ? fileValue.name : t("chooseFile")}
              </Button>
              {fileValue && !disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onFileChange(null)}
                >
                  {t("removeFile")}
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              id={`file-${field.field_key}`}
              className="hidden"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              disabled={disabled}
            />
            {field.help_text && (
              <p className="text-xs text-muted-foreground">{field.help_text}</p>
            )}
          </div>
        );

      case "statement":
        return (
          <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg border">
            <input
              type="checkbox"
              checked={value === "true"}
              onChange={(e) => onChange(e.target.checked ? "true" : "")}
              className="h-5 w-5 mt-0.5 rounded border-gray-300"
              style={{ accentColor: themeColor }}
              disabled={disabled}
            />
            <div className="space-y-1">
              <span className="text-sm font-medium leading-relaxed">{field.label}</span>
              {field.help_text && (
                <p className="text-xs text-muted-foreground">{field.help_text}</p>
              )}
            </div>
          </div>
        );

      default:
        return (
          <Input
            placeholder={field.placeholder ?? ""}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        );
    }
  };

  // Statement type memiliki label inline, jangan tampilkan label di atas
  if (field.field_type === "statement") {
    return renderField();
  }

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.is_required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {renderField()}
      {field.help_text && field.field_type !== "file" && (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      )}
    </div>
  );
}
