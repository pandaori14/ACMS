"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ShieldAlert, Info, CheckCircle2, Paperclip, Eye } from "lucide-react";
import api from "@/lib/api";
import type { IncidentFormOptions } from "@/types/incident";

interface FormState {
  incident_type: string;
  incident_date: string;
  location: string;
  description: string;
  involved_parties: string;
  is_anonymous: boolean;
  severity: string;
}

const EMPTY_FORM: FormState = {
  incident_type: "",
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
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [options, setOptions] = useState<IncidentFormOptions | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    api.get("/api/v1/incidents/form-options")
      .then((res) => setOptions(res.data.data))
      .catch(() => {});
  }, []);

  const disabled = previewMode;
  const allowedTypes = options?.attachment.allowed_types ?? "jpg,jpeg,png,pdf,doc,docx";
  const maxSizeMb = options?.attachment.max_size_mb ?? 10;
  const acceptAttr = allowedTypes.split(",").map((t) => `.${t.trim()}`).join(",");

  const handleChange = (field: keyof FormState, value: string | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value ?? "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previewMode) return;

    if (!formData.incident_type || !formData.incident_date || !formData.location || !formData.description) {
      toast.error("Harap lengkapi field yang wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("incident_type", formData.incident_type);
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
      toast.success(res.data.message ?? "Laporan berhasil dikirim");
      setIsSubmitted(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } } };
      toast.error(e.response?.data?.error ?? e.response?.data?.message ?? "Terjadi kesalahan saat mengirim laporan");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
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
            <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">Laporan Diterima</h3>
            <p className="text-muted-foreground mt-4 text-lg">
              Terima kasih telah melaporkan kejadian ini. Laporan Anda sangat berharga untuk menjaga lingkungan klinis yang aman dan kondusif bagi semua pihak.
            </p>
            <Button className="mt-8" onClick={resetForm}>
              Kirim Laporan Lain
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={previewMode ? "" : "max-w-3xl mx-auto space-y-6 pb-12"}>
      {!previewMode && (
        <>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-red-700 dark:text-red-400 flex items-center gap-2">
              <ShieldAlert className="h-8 w-8" />
              Pelaporan Insiden
            </h1>
            <p className="text-muted-foreground mt-2">
              Formulir untuk melaporkan insiden keselamatan mahasiswa, keselamatan pasien, K3, perundungan, atau pelanggaran etik di lingkungan akademik klinis.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 p-4 rounded-lg flex gap-3 text-sm border border-blue-200 dark:border-blue-900">
            <Info className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              Laporan Anda akan ditangani secara rahasia. Jika Anda memilih opsi <strong>Lapor Anonim</strong>, identitas Anda tidak akan direkam di database dan tidak dapat dilihat oleh siapapun termasuk Admin.
            </p>
          </div>
        </>
      )}

      {previewMode && (
        <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 p-4 rounded-lg flex gap-3 text-sm border border-amber-200 dark:border-amber-900 mb-4">
          <Eye className="h-5 w-5 shrink-0 mt-0.5" />
          <p>
            <strong>Mode Preview.</strong> Beginilah tampilan form yang dilihat mahasiswa/pelapor berdasarkan konfigurasi saat ini. Input dinonaktifkan di mode ini.
          </p>
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Detail Insiden</CardTitle>
            <CardDescription>Jelaskan kejadian dengan sebenar-benarnya dan selengkap mungkin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="incident_type">Jenis Insiden <span className="text-red-500">*</span></Label>
                <Select value={formData.incident_type} onValueChange={(v) => handleChange("incident_type", v)} disabled={disabled}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis Insiden" />
                  </SelectTrigger>
                  <SelectContent>
                    {(options?.incident_types ?? []).map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="incident_date">Tanggal Kejadian <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  id="incident_date"
                  value={formData.incident_date}
                  onChange={(e) => handleChange("incident_date", e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Tingkat Keparahan</Label>
              <Select value={formData.severity} onValueChange={(v) => handleChange("severity", v)} disabled={disabled}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Tingkat Keparahan (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  {(options?.incident_severities ?? []).map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lokasi Kejadian <span className="text-red-500">*</span></Label>
              <Input
                id="location"
                placeholder="Cth: Ruang Jaga IGD RSUP Dr. Sardjito, Bangsal Dahlia, dll"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="involved_parties">Pihak yang Terlibat (Opsional)</Label>
              <Input
                id="involved_parties"
                placeholder="Nama/Jabatan orang yang terlibat (jika diketahui)"
                value={formData.involved_parties}
                onChange={(e) => handleChange("involved_parties", e.target.value)}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Kronologi Singkat <span className="text-red-500">*</span></Label>
              <Textarea
                id="description"
                placeholder="Ceritakan kejadian secara jelas (siapa, apa yang terjadi, dan bagaimana) — minimal 20 karakter"
                className="min-h-[150px] resize-y"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                disabled={disabled}
              />
            </div>

            {/* File Attachment */}
            <div className="space-y-2">
              <Label htmlFor="attachment">Lampiran Bukti (Opsional)</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  {attachmentFile ? attachmentFile.name : "Pilih File"}
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
                    Hapus
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
                Format: {allowedTypes.toUpperCase().replace(/,/g, ", ")}. Maksimal {maxSizeMb} MB.
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
                  Sembunyikan Identitas Saya (Lapor Anonim)
                </label>
                <p className="text-xs text-muted-foreground">
                  Nama Anda tidak akan disertakan dalam laporan ini. Laporan sepenuhnya tanpa nama.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 bg-muted/20 pt-6">
            {!previewMode && (
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => window.history.back()}>Batal</Button>
            )}
            <Button type="submit" disabled={loading || disabled} className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto sm:ml-auto">
              {loading ? "Mengirim Laporan..." : "Kirim Laporan Insiden"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
