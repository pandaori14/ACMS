"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";
import { Settings2, ListChecks, Gauge, SlidersHorizontal, Eye, Plus, Save, ShieldAlert, BellRing, ExternalLink, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { IncidentConfig, IncidentConfigSettings, IncidentNotificationConfig } from "@/types/incident";
import IncidentReportForm from "./IncidentReportForm";
import FormTemplateBuilder from "./FormTemplateBuilder";

interface EditableRef {
  id?: string;
  value: string;
  name: string;
  is_active: boolean;
  isNew?: boolean;
}

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export default function IncidentConfigurator() {
  const [types, setTypes] = useState<EditableRef[]>([]);
  const [severities, setSeverities] = useState<EditableRef[]>([]);
  const [settings, setSettings] = useState<IncidentConfigSettings | null>(null);
  const [notification, setNotification] = useState<IncidentNotificationConfig>({ notify_roles: [], cc_emails: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/incidents/config");
      const data: IncidentConfig = res.data.data;
      setTypes(data.incident_types.map((t) => ({ id: t.id, value: t.value, name: t.name, is_active: t.is_active })));
      setSeverities(data.incident_severities.map((s) => ({ id: s.id, value: s.value, name: s.name, is_active: s.is_active })));
      setSettings(data.settings);
      setNotification(data.notification ?? { notify_roles: [], cc_emails: "" });
    } catch {
      toast.error("Gagal memuat konfigurasi form insiden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    // Validasi ringan: item baru wajib punya nama & value unik
    const allRefs = [...types, ...severities];
    if (allRefs.some((r) => !r.name.trim() || !r.value.trim())) {
      toast.error("Setiap item harus memiliki nama dan kode (value).");
      return;
    }

    setSaving(true);
    try {
      await api.put("/api/v1/incidents/config", {
        incident_types: types.map((t) => ({ value: t.value, name: t.name, is_active: t.is_active })),
        incident_severities: severities.map((s) => ({ value: s.value, name: s.name, is_active: s.is_active })),
        settings,
      });
      toast.success("Konfigurasi form insiden berhasil disimpan");
      setPreviewKey((k) => k + 1);
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "Gagal menyimpan konfigurasi");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof IncidentConfigSettings>(key: K, value: IncidentConfigSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Memuat konfigurasi form insiden...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-400 flex items-center gap-2">
            <Settings2 className="h-8 w-8" />
            Konfigurasi Form Insiden
          </h1>
          <p className="text-muted-foreground mt-1">
            Atur jenis insiden, tingkat keparahan, aturan lampiran, dan notifikasi. Perubahan langsung memengaruhi form yang dilihat pelapor.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-900 hover:bg-blue-800 text-white">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
        </Button>
      </div>

      <Tabs defaultValue="types" className="w-full">
        <TabsList className="w-full max-w-full overflow-x-auto justify-start">
          <TabsTrigger value="types" className="shrink-0"><ListChecks className="h-4 w-4" /> Jenis Insiden</TabsTrigger>
          <TabsTrigger value="severities" className="shrink-0"><Gauge className="h-4 w-4" /> Tingkat Keparahan</TabsTrigger>
          <TabsTrigger value="builder" className="shrink-0"><LayoutTemplate className="h-4 w-4" /> Form Builder</TabsTrigger>
          <TabsTrigger value="rules" className="shrink-0"><SlidersHorizontal className="h-4 w-4" /> Aturan & Notifikasi</TabsTrigger>
          <TabsTrigger value="preview" className="shrink-0"><Eye className="h-4 w-4" /> Preview Mahasiswa</TabsTrigger>
        </TabsList>

        {/* TAB: Jenis Insiden */}
        <TabsContent value="types">
          <ReferenceEditor
            title="Jenis Insiden"
            description="Opsi yang muncul pada dropdown 'Jenis Insiden'. Nonaktifkan (bukan hapus) item lama agar laporan terdahulu tetap konsisten."
            items={types}
            setItems={setTypes}
          />
        </TabsContent>

        {/* TAB: Tingkat Keparahan */}
        <TabsContent value="severities">
          <ReferenceEditor
            title="Tingkat Keparahan"
            description="Opsi yang muncul pada dropdown 'Tingkat Keparahan'."
            items={severities}
            setItems={setSeverities}
          />
        </TabsContent>

        {/* TAB: Form Builder */}
        <TabsContent value="builder">
          <FormTemplateBuilder incidentTypes={types} />
        </TabsContent>

        {/* TAB: Aturan & Notifikasi */}
        <TabsContent value="rules">
          {settings && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aturan Lampiran & Notifikasi</CardTitle>
                <CardDescription>Berlaku untuk semua laporan insiden baru.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-xl">
                <div className="space-y-2">
                  <Label htmlFor="max_size">Ukuran Maksimal Lampiran (MB)</Label>
                  <Input
                    id="max_size"
                    type="number"
                    min={1}
                    max={100}
                    value={settings.incident_max_attachment_size_mb}
                    onChange={(e) => updateSetting("incident_max_attachment_size_mb", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allowed_types">Jenis File yang Diizinkan</Label>
                  <Input
                    id="allowed_types"
                    value={settings.incident_allowed_attachment_types}
                    onChange={(e) => updateSetting("incident_allowed_attachment_types", e.target.value)}
                    placeholder="jpg,jpeg,png,pdf,doc,docx"
                  />
                  <p className="text-xs text-muted-foreground">Pisahkan dengan koma, tanpa spasi. Contoh: jpg,png,pdf</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Batas Waktu Respons Investigasi (jam)</Label>
                  <Input
                    id="deadline"
                    type="number"
                    min={1}
                    max={720}
                    value={settings.incident_response_deadline_hours}
                    onChange={(e) => updateSetting("incident_response_deadline_hours", Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Dipakai untuk pengingat otomatis tindak lanjut.</p>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Notifikasi Darurat Otomatis (Insiden Kritis)</Label>
                    <p className="text-xs text-muted-foreground">Kirim notifikasi segera saat ada laporan dengan severity kritis.</p>
                  </div>
                  <Switch
                    checked={settings.incident_auto_notify_critical}
                    onCheckedChange={(c) => updateSetting("incident_auto_notify_critical", !!c)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Penerima Notifikasi Pelaporan (read-only — dikelola terpusat di matrix SMTP) */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BellRing className="h-4 w-4 text-blue-600" /> Penerima Notifikasi Pelaporan
              </CardTitle>
              <CardDescription>
                Pihak yang menerima notifikasi (email &amp; in-app) setiap kali ada laporan insiden baru. Diatur terpusat oleh Super Admin di <strong>Pengaturan Sistem → SMTP (Email) → Matriks Notifikasi</strong> agar konsisten dengan modul lain.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Peran Penerima Saat Ini</Label>
                {notification.notify_roles.length === 0 ? (
                  <p className="text-sm text-amber-600">Belum ada peran yang ditetapkan — notifikasi pelaporan belum terkirim ke siapa pun.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {notification.notify_roles.map((role) => (
                      <span key={role} className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 text-sm font-medium">
                        {role}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {notification.cc_emails && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">CC Email Tambahan</Label>
                  <p className="text-sm font-mono text-slate-600 dark:text-slate-300">{notification.cc_emails}</p>
                </div>
              )}

              <Link href="/dashboard/settings" className="inline-block pt-1">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" /> Kelola Penerima di Pengaturan SMTP
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Preview Mahasiswa */}
        <TabsContent value="preview">
          <Card className="border-amber-200 dark:border-amber-900">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-600" /> Pratinjau Form Pelapor
              </CardTitle>
              <CardDescription>
                Simpan konfigurasi terlebih dahulu agar pratinjau menampilkan perubahan terbaru.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IncidentReportForm key={previewKey} previewMode />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ReferenceEditorProps {
  title: string;
  description: string;
  items: EditableRef[];
  setItems: React.Dispatch<React.SetStateAction<EditableRef[]>>;
}

function ReferenceEditor({ title, description, items, setItems }: ReferenceEditorProps) {
  const updateItem = (index: number, patch: Partial<EditableRef>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { value: "", name: "", is_active: true, isNew: true }]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id ?? `new-${index}`} className="flex flex-wrap items-end gap-3 p-3 border rounded-lg bg-muted/20">
            <div className="space-y-1 flex-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">Nama Tampilan</Label>
              <Input
                value={item.name}
                placeholder="Cth: Kekerasan Seksual"
                onChange={(e) => {
                  const name = e.target.value;
                  // Untuk item baru, value otomatis dari nama (slug) selama belum diubah manual
                  if (item.isNew) {
                    updateItem(index, { name, value: slugify(name) });
                  } else {
                    updateItem(index, { name });
                  }
                }}
              />
            </div>
            <div className="space-y-1 w-[180px]">
              <Label className="text-xs text-muted-foreground">Kode (value)</Label>
              <Input
                value={item.value}
                disabled={!item.isNew}
                placeholder="kode_unik"
                onChange={(e) => updateItem(index, { value: slugify(e.target.value) })}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Aktif</Label>
              <div className="h-9 flex items-center">
                <Switch
                  checked={item.is_active}
                  onCheckedChange={(c) => updateItem(index, { is_active: !!c })}
                />
              </div>
            </div>
            {item.isNew && (
              <span className="text-[10px] font-semibold text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded uppercase tracking-wide">Baru</span>
            )}
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addItem} className="mt-2">
          <Plus className="h-4 w-4 mr-2" /> Tambah {title}
        </Button>
      </CardContent>
    </Card>
  );
}
