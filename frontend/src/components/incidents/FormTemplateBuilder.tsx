"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Save, Trash2, Copy, GripVertical, Eye, ArrowLeft, ChevronDown, ChevronUp,
  Power, PowerOff, Layers, Settings2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type {
  FormTemplate, FormTemplateListItem, FormSection, FormField,
  FieldType, FieldOption,
} from "@/types/incident-form";
import { FIELD_TYPE_LABELS, OPTION_FIELD_TYPES } from "@/types/incident-form";
import type { IncidentFormOption } from "@/types/incident";
import DynamicIncidentForm from "./DynamicIncidentForm";

// ─────────────────────────────────────────────────
//  Props
// ─────────────────────────────────────────────────

interface FormTemplateBuilderProps {
  /** Jenis insiden yang tersedia (dari form-options). */
  incidentTypes: IncidentFormOption[];
}

// ─────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function generateId(): string {
  return crypto.randomUUID();
}

// ─────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────

export default function FormTemplateBuilder({ incidentTypes }: FormTemplateBuilderProps) {
  const [templates, setTemplates] = useState<FormTemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  // ─── Load Templates ────────────────────────────

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/incidents/config/templates");
      setTemplates(res.data.data ?? []);
    } catch {
      toast.error("Gagal memuat daftar template form");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // ─── Open Editor ───────────────────────────────

  const openEditor = useCallback(async (templateId: string) => {
    try {
      const res = await api.get(`/api/v1/incidents/config/templates/${templateId}`);
      setEditingTemplate(res.data.data);
    } catch {
      toast.error("Gagal memuat template");
    }
  }, []);

  // ─── Create New Template ───────────────────────

  const createNewTemplate = useCallback(async (incidentType: string) => {
    const typeMeta = incidentTypes.find((t) => t.value === incidentType);
    try {
      const res = await api.post("/api/v1/incidents/config/templates", {
        incident_type: incidentType,
        name: `Formulir ${typeMeta?.name ?? incidentType}`,
        header_title: `Formulir Laporan ${typeMeta?.name ?? incidentType}`,
        header_subtitle: "Dokter Muda Fakultas Kedokteran UMS",
        theme_color: "#1E3A8A",
        sections: [
          {
            title: "1. Data Pelapor",
            icon: "user",
            fields: [
              { label: "Nama Lengkap", field_key: "nama_lengkap", field_type: "text", is_required: true, grid_cols: 2, placeholder: "Ketik nama lengkap Anda..." },
              { label: "Alamat Email", field_key: "email", field_type: "email", is_required: true, grid_cols: 2, placeholder: "email@domain.com" },
            ],
          },
          {
            title: "2. Detail Kejadian",
            icon: "alert-triangle",
            fields: [
              { label: "Waktu Kejadian", field_key: "waktu_kejadian", field_type: "datetime", is_required: true, grid_cols: 2 },
              { label: "Lokasi Kejadian", field_key: "lokasi_kejadian", field_type: "text", is_required: true, grid_cols: 2, placeholder: "Cth: Bangsal Melati, IGD..." },
              { label: "Kronologi Kejadian", field_key: "kronologi_insiden", field_type: "textarea", is_required: true, placeholder: "Ceritakan urutan kejadian secara jelas..." },
            ],
          },
        ],
      });
      toast.success("Template baru berhasil dibuat");
      setEditingTemplate(res.data.data);
      loadTemplates();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "Gagal membuat template");
    }
  }, [incidentTypes, loadTemplates]);

  // ─── Save Template ─────────────────────────────

  const saveTemplate = useCallback(async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const payload = {
        name: editingTemplate.name,
        description: editingTemplate.description,
        header_title: editingTemplate.header_title,
        header_subtitle: editingTemplate.header_subtitle,
        theme_color: editingTemplate.theme_color,
        sections: editingTemplate.sections.map((s, si) => ({
          id: s.id.startsWith("new-") ? undefined : s.id,
          title: s.title,
          icon: s.icon,
          description: s.description,
          sort_order: si,
          is_visible: s.is_visible,
          conditional_field_id: s.conditional_field_id,
          conditional_value: s.conditional_value,
          fields: s.fields.map((f, fi) => ({
            id: f.id.startsWith("new-") ? undefined : f.id,
            label: f.label,
            field_key: f.field_key,
            field_type: f.field_type,
            placeholder: f.placeholder,
            help_text: f.help_text,
            is_required: f.is_required,
            sort_order: fi,
            options: f.options,
            validation_rules: f.validation_rules,
            grid_cols: f.grid_cols,
          })),
        })),
      };

      const res = await api.put(`/api/v1/incidents/config/templates/${editingTemplate.id}`, payload);
      setEditingTemplate(res.data.data);
      setPreviewKey((k) => k + 1);
      toast.success("Template berhasil disimpan");
      loadTemplates();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "Gagal menyimpan template");
    } finally {
      setSaving(false);
    }
  }, [editingTemplate, loadTemplates]);

  // ─── Template Actions ──────────────────────────

  const toggleActive = useCallback(async (id: string, currentlyActive: boolean) => {
    try {
      const endpoint = currentlyActive ? "deactivate" : "activate";
      await api.patch(`/api/v1/incidents/config/templates/${id}/${endpoint}`);
      toast.success(currentlyActive ? "Template dinonaktifkan" : "Template diaktifkan");
      loadTemplates();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "Gagal mengubah status template");
    }
  }, [loadTemplates]);

  const cloneTemplate = useCallback(async (id: string) => {
    try {
      await api.post(`/api/v1/incidents/config/templates/${id}/clone`);
      toast.success("Template berhasil diduplikasi");
      loadTemplates();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "Gagal menduplikasi");
    }
  }, [loadTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    if (!confirm("Yakin ingin menghapus template ini?")) return;
    try {
      await api.delete(`/api/v1/incidents/config/templates/${id}`);
      toast.success("Template berhasil dihapus");
      loadTemplates();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "Gagal menghapus template");
    }
  }, [loadTemplates]);

  // ─── Section / Field Editing Helpers ────────────

  const updateTemplate = useCallback((patch: Partial<FormTemplate>) => {
    setEditingTemplate((prev) => prev ? { ...prev, ...patch } : prev);
  }, []);

  const addSection = useCallback(() => {
    if (!editingTemplate) return;
    const newSection: FormSection = {
      id: `new-${generateId()}`,
      title: "Section Baru",
      icon: null,
      description: null,
      sort_order: editingTemplate.sections.length,
      is_visible: true,
      conditional_field_id: null,
      conditional_value: null,
      fields: [],
    };
    updateTemplate({ sections: [...editingTemplate.sections, newSection] });
  }, [editingTemplate, updateTemplate]);

  const updateSection = useCallback((sectionIndex: number, patch: Partial<FormSection>) => {
    if (!editingTemplate) return;
    const sections = [...editingTemplate.sections];
    sections[sectionIndex] = { ...sections[sectionIndex], ...patch };
    updateTemplate({ sections });
  }, [editingTemplate, updateTemplate]);

  const removeSection = useCallback((sectionIndex: number) => {
    if (!editingTemplate) return;
    const sections = editingTemplate.sections.filter((_, i) => i !== sectionIndex);
    updateTemplate({ sections });
  }, [editingTemplate, updateTemplate]);

  const moveSection = useCallback((index: number, direction: "up" | "down") => {
    if (!editingTemplate) return;
    const sections = [...editingTemplate.sections];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
    updateTemplate({ sections });
  }, [editingTemplate, updateTemplate]);

  const addField = useCallback((sectionIndex: number) => {
    if (!editingTemplate) return;
    const sections = [...editingTemplate.sections];
    const newField: FormField = {
      id: `new-${generateId()}`,
      label: "Field Baru",
      field_key: `field_${Date.now()}`,
      field_type: "text",
      placeholder: null,
      help_text: null,
      is_required: false,
      sort_order: sections[sectionIndex].fields.length,
      options: null,
      validation_rules: null,
      grid_cols: 1,
    };
    sections[sectionIndex] = {
      ...sections[sectionIndex],
      fields: [...sections[sectionIndex].fields, newField],
    };
    updateTemplate({ sections });
  }, [editingTemplate, updateTemplate]);

  const updateField = useCallback((sectionIndex: number, fieldIndex: number, patch: Partial<FormField>) => {
    if (!editingTemplate) return;
    const sections = [...editingTemplate.sections];
    const fields = [...sections[sectionIndex].fields];
    fields[fieldIndex] = { ...fields[fieldIndex], ...patch };
    sections[sectionIndex] = { ...sections[sectionIndex], fields };
    updateTemplate({ sections });
  }, [editingTemplate, updateTemplate]);

  const removeField = useCallback((sectionIndex: number, fieldIndex: number) => {
    if (!editingTemplate) return;
    const sections = [...editingTemplate.sections];
    const fields = sections[sectionIndex].fields.filter((_, i) => i !== fieldIndex);
    sections[sectionIndex] = { ...sections[sectionIndex], fields };
    updateTemplate({ sections });
  }, [editingTemplate, updateTemplate]);

  // ─── Render: Editor Mode ───────────────────────

  if (editingTemplate) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-blue-900 dark:text-blue-400">
                Editor Template Form
              </h1>
              <p className="text-sm text-muted-foreground">
                {editingTemplate.name} — v{editingTemplate.version}
              </p>
            </div>
          </div>
          <Button onClick={saveTemplate} disabled={saving} className="bg-blue-900 hover:bg-blue-800 text-white">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Menyimpan..." : "Simpan Template"}
          </Button>
        </div>

        <Tabs defaultValue="build">
          <TabsList>
            <TabsTrigger value="build"><Layers className="h-4 w-4 mr-1" /> Bangun Form</TabsTrigger>
            <TabsTrigger value="settings"><Settings2 className="h-4 w-4 mr-1" /> Pengaturan</TabsTrigger>
            <TabsTrigger value="preview"><Eye className="h-4 w-4 mr-1" /> Preview</TabsTrigger>
          </TabsList>

          {/* TAB: Build */}
          <TabsContent value="build" className="space-y-4">
            {editingTemplate.sections.map((section, si) => (
              <Card key={section.id} className="border-l-4" style={{ borderLeftColor: editingTemplate.theme_color }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        value={section.title}
                        onChange={(e) => updateSection(si, { title: e.target.value })}
                        className="font-semibold text-base"
                        placeholder="Judul Section"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => moveSection(si, "up")} disabled={si === 0}>
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => moveSection(si, "down")} disabled={si === editingTemplate.sections.length - 1}>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeSection(si)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 pl-6">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Ikon:</Label>
                      <Input
                        value={section.icon ?? ""}
                        onChange={(e) => updateSection(si, { icon: e.target.value || null })}
                        placeholder="user"
                        className="w-32 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Deskripsi:</Label>
                      <Input
                        value={section.description ?? ""}
                        onChange={(e) => updateSection(si, { description: e.target.value || null })}
                        placeholder="Teks bantuan section"
                        className="text-xs flex-1"
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pl-8">
                  {section.fields.map((field, fi) => (
                    <FieldEditor
                      key={field.id}
                      field={field}
                      onUpdate={(patch) => updateField(si, fi, patch)}
                      onRemove={() => removeField(si, fi)}
                    />
                  ))}

                  <Button variant="outline" size="sm" onClick={() => addField(si)} className="mt-2">
                    <Plus className="h-4 w-4 mr-2" /> Tambah Field
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" onClick={addSection} className="w-full border-dashed">
              <Plus className="h-4 w-4 mr-2" /> Tambah Section
            </Button>
          </TabsContent>

          {/* TAB: Settings */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pengaturan Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-w-xl">
                <div className="space-y-2">
                  <Label>Nama Template</Label>
                  <Input value={editingTemplate.name} onChange={(e) => updateTemplate({ name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Deskripsi</Label>
                  <Textarea value={editingTemplate.description ?? ""} onChange={(e) => updateTemplate({ description: e.target.value || null })} />
                </div>
                <div className="space-y-2">
                  <Label>Judul Header</Label>
                  <Input value={editingTemplate.header_title} onChange={(e) => updateTemplate({ header_title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle Header</Label>
                  <Input value={editingTemplate.header_subtitle ?? ""} onChange={(e) => updateTemplate({ header_subtitle: e.target.value || null })} />
                </div>
                <div className="space-y-2">
                  <Label>Warna Tema (Hex)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      value={editingTemplate.theme_color}
                      onChange={(e) => updateTemplate({ theme_color: e.target.value })}
                      placeholder="#1E3A8A"
                      className="w-32 font-mono text-sm"
                    />
                    <div className="h-9 w-9 rounded-md border" style={{ backgroundColor: editingTemplate.theme_color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Preview */}
          <TabsContent value="preview">
            <Card className="border-amber-200 dark:border-amber-900">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Pratinjau Form Pelapor
                </CardTitle>
                <CardDescription>Simpan template terlebih dahulu agar preview menampilkan perubahan.</CardDescription>
              </CardHeader>
              <CardContent>
                <DynamicIncidentForm
                  key={previewKey}
                  template={{
                    id: editingTemplate.id,
                    name: editingTemplate.name,
                    header_title: editingTemplate.header_title,
                    header_subtitle: editingTemplate.header_subtitle,
                    theme_color: editingTemplate.theme_color,
                    version: editingTemplate.version,
                    sections: editingTemplate.sections,
                  }}
                  incidentType={editingTemplate.incident_type}
                  previewMode
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ─── Render: Template List ─────────────────────

  if (loading) {
    return <div className="flex items-center justify-center h-32 text-muted-foreground">Memuat template...</div>;
  }

  // Kelompokkan template per incident_type
  const grouped: Record<string, FormTemplateListItem[]> = {};
  for (const t of templates) {
    if (!grouped[t.incident_type]) grouped[t.incident_type] = [];
    grouped[t.incident_type].push(t);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-blue-900 dark:text-blue-400 flex items-center gap-2">
          <Layers className="h-5 w-5" /> Template Form per Jenis Insiden
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Setiap jenis insiden bisa memiliki template form sendiri. Hanya 1 template yang bisa aktif per jenis.
        </p>
      </div>

      {incidentTypes.map((type) => {
        const typeTemplates = grouped[type.value] ?? [];
        const activeOne = typeTemplates.find((t) => t.is_active);

        return (
          <Card key={type.value}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{type.name}</CardTitle>
                  <CardDescription>
                    {activeOne
                      ? `Template aktif: ${activeOne.name} (v${activeOne.version})`
                      : "Belum ada template aktif — menggunakan form standar."}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => createNewTemplate(type.value)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Buat Template
                </Button>
              </div>
            </CardHeader>

            {typeTemplates.length > 0 && (
              <CardContent>
                <div className="space-y-2">
                  {typeTemplates.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: t.theme_color }} />
                        <div>
                          <span className="font-medium text-sm">{t.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            v{t.version} · {t.sections_count} section
                          </span>
                        </div>
                        {t.is_active && (
                          <span className="text-[10px] font-semibold text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded uppercase tracking-wide">
                            Aktif
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditor(t.id)} title="Edit">
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(t.id, t.is_active)}
                          title={t.is_active ? "Nonaktifkan" : "Aktifkan"}
                        >
                          {t.is_active
                            ? <PowerOff className="h-4 w-4 text-amber-500" />
                            : <Power className="h-4 w-4 text-green-500" />
                          }
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => cloneTemplate(t.id)} title="Duplikasi">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTemplate(t.id)}
                          title="Hapus"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────
//  Field Editor (inline)
// ─────────────────────────────────────────────────

interface FieldEditorProps {
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
  onRemove: () => void;
}

function FieldEditor({ field, onUpdate, onRemove }: FieldEditorProps) {
  const [expanded, setExpanded] = useState(false);
  const needsOptions = OPTION_FIELD_TYPES.includes(field.field_type);

  return (
    <div className="p-3 border rounded-lg bg-white dark:bg-slate-950/50 space-y-3">
      {/* Row 1: Label + Type + Required + Delete */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px] space-y-1">
          <Label className="text-xs text-muted-foreground">Label</Label>
          <Input
            value={field.label}
            onChange={(e) => {
              const label = e.target.value;
              // Auto-generate field_key dari label untuk field baru
              if (field.id.startsWith("new-")) {
                onUpdate({ label, field_key: slugify(label) });
              } else {
                onUpdate({ label });
              }
            }}
            placeholder="Label field"
          />
        </div>
        <div className="w-[160px] space-y-1">
          <Label className="text-xs text-muted-foreground">Tipe</Label>
          <Select value={field.field_type} onValueChange={(v) => onUpdate({ field_type: v as FieldType })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FIELD_TYPE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[80px] space-y-1">
          <Label className="text-xs text-muted-foreground">Lebar</Label>
          <Select value={String(field.grid_cols)} onValueChange={(v) => onUpdate({ grid_cols: Number(v) })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Full</SelectItem>
              <SelectItem value="2">½</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 h-9">
          <Switch checked={field.is_required} onCheckedChange={(c) => onUpdate({ is_required: !!c })} />
          <Label className="text-xs">Wajib</Label>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onRemove} className="text-red-500 hover:text-red-700">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded: key, placeholder, help_text, options */}
      {expanded && (
        <div className="space-y-3 pt-2 border-t">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Field Key (slug)</Label>
              <Input
                value={field.field_key}
                onChange={(e) => onUpdate({ field_key: slugify(e.target.value) })}
                className="font-mono text-xs"
                disabled={!field.id.startsWith("new-")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Placeholder</Label>
              <Input
                value={field.placeholder ?? ""}
                onChange={(e) => onUpdate({ placeholder: e.target.value || null })}
                placeholder="Teks placeholder..."
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Teks Bantuan</Label>
            <Input
              value={field.help_text ?? ""}
              onChange={(e) => onUpdate({ help_text: e.target.value || null })}
              placeholder="Keterangan tambahan..."
            />
          </div>

          {/* Options Editor (for select, checkbox, radio, multiselect) */}
          {needsOptions && (
            <OptionsEditor
              options={field.options ?? []}
              onChange={(opts) => onUpdate({ options: opts })}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
//  Options Editor (value/label pairs)
// ─────────────────────────────────────────────────

interface OptionsEditorProps {
  options: FieldOption[];
  onChange: (options: FieldOption[]) => void;
}

function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const updateOption = (index: number, patch: Partial<FieldOption>) => {
    const updated = [...options];
    updated[index] = { ...updated[index], ...patch };
    onChange(updated);
  };

  const addOption = () => {
    onChange([...options, { value: "", label: "" }]);
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Opsi Pilihan</Label>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={opt.label}
            onChange={(e) => {
              const label = e.target.value;
              // Auto-generate value dari label
              if (!opt.value || opt.value === slugify(options[i]?.label ?? "")) {
                updateOption(i, { label, value: slugify(label) });
              } else {
                updateOption(i, { label });
              }
            }}
            placeholder="Label tampilan"
            className="flex-1"
          />
          <Input
            value={opt.value}
            onChange={(e) => updateOption(i, { value: e.target.value })}
            placeholder="value"
            className="w-32 font-mono text-xs"
          />
          <Button variant="ghost" size="icon" onClick={() => removeOption(i)} className="text-red-500 shrink-0">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addOption}>
        <Plus className="h-3 w-3 mr-1" /> Tambah Opsi
      </Button>
    </div>
  );
}
