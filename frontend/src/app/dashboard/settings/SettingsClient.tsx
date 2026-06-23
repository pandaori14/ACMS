"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Save, Loader2, MonitorSmartphone, GraduationCap, Stethoscope, Landmark, ShieldCheck,
  LayoutTemplate, Mail, Key, Plus, Trash2, BookOpen, MapPin, Search, Scale, Bot, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

interface MatrixRule {
  trigger_field?: string;
  trigger_value?: string;
  additional_cc?: string;
  additional_roles?: string[];
}

interface MatrixNode {
  enabled?: boolean;
  cc_emails?: string;
  notify_roles?: string[];
  conditional_rules?: MatrixRule[];
  [key: string]: unknown;
}
import { useAuthStore } from "@/store/useAuthStore";

interface Setting {
  key: string;
  group: string;
  value: string | null;
  type: string;
  description: string | null;
}

interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

interface Section {
  label: string;
  items: Category[];
}

// Navigation grouped into cross-cutting "system" settings and per-module settings.
const SECTIONS: Section[] = [
  {
    label: "Umum & Sistem",
    items: [
      { id: "general", label: "Umum", icon: MonitorSmartphone, description: "Nama aplikasi, warna tema, logo, dan konfigurasi global." },
      { id: "landing", label: "Landing Page", icon: LayoutTemplate, description: "Judul, deskripsi, dan elemen visual halaman publik." },
      { id: "security", label: "Keamanan", icon: ShieldCheck, description: "Timeout sesi dan penegakan Two-Factor Authentication (2FA)." },
      { id: "smtp", label: "SMTP (Email)", icon: Mail, description: "Server email, template, dan matriks notifikasi otomatis." },
      { id: "oauth", label: "OAuth (SSO)", icon: Key, description: "Kredensial Google Single Sign-On." },
      { id: "guide", label: "Panduan", icon: BookOpen, description: "Konten panduan pelaporan insiden per peran (Markdown)." },
      { id: "ai_assistant", label: "AI Assistant", icon: Bot, description: "Konfigurasi LLM (NVIDIA NIM / Ollama): aktif, base URL, model, API key (terenkripsi), system prompt." },
    ],
  },
  {
    label: "Per Modul",
    items: [
      { id: "academic", label: "Akademik", icon: GraduationCap, description: "Tahun ajaran, semester, dan kebijakan akademik." },
      { id: "assessment", label: "Penilaian", icon: Scale, description: "Bobot komponen nilai (Logbook/Mini-CEX/DOPS/CBD) dan rentang nilai huruf." },
      { id: "clinical", label: "Klinis & Logbook", icon: Stethoscope, description: "Batas pengisian dan auto-verifikasi logbook klinis." },
      { id: "attendance", label: "Presensi", icon: MapPin, description: "Geofence GPS, radius default, ambang terlambat, dan deteksi anomali." },
      { id: "finance", label: "Keuangan", icon: Landmark, description: "Tarif honorarium dan siklus penagihan rumah sakit." },
    ],
  },
];

const ALL_CATEGORIES: Category[] = SECTIONS.flatMap((s) => s.items);

// Settings that exist in the DB but whose feature is not yet enforced by the backend.
// Shown with a "Belum aktif" badge so the Super Admin is not misled.
const INACTIVE_KEYS = [
  "enforce_2fa",
  "enable_email_broadcasts",
  "allow_student_appeals",
  "evaluation_required_for_transcript",
  "billing_cycle",
];

export function SettingsClient() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState("general");
  const [search, setSearch] = useState("");
  // Opsi nilai-pemicu untuk aturan bersyarat matriks (diambil dari system_references).
  const [triggerRefs, setTriggerRefs] = useState<Record<string, { value: string; name: string }[]>>({});
  const user = useAuthStore((state) => state.user);
  const userRole = user?.roles?.[0] || "";

  useEffect(() => {
    fetchSettings();
    // Muat referensi untuk dropdown nilai pemicu (incident_type & category).
    Promise.all([
      api.get("/api/system-references", { params: { category: "incident_types" } }).then((r) => r.data.data ?? r.data).catch(() => []),
      api.get("/api/system-references", { params: { category: "consultation_categories" } }).then((r) => r.data.data ?? r.data).catch(() => []),
    ]).then(([incidentTypes, consultationCategories]) => {
      const pick = (arr: { value: string; name: string }[]) => (arr || []).map((x) => ({ value: x.value, name: x.name }));
      setTriggerRefs({
        incident_type: pick(incidentTypes),
        category: pick(consultationCategories),
        status: [
          { value: "submitted", name: "Laporan Masuk" },
          { value: "investigating", name: "Investigasi" },
          { value: "resolved", name: "Selesai" },
        ],
      });
    });
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get("/api/settings");
      setSettings(data);
    } catch (err) {
      toast.error("Gagal memuat pengaturan.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      settings.forEach((s, index) => {
        formData.append(`settings[${index}][key]`, s.key);
        formData.append(`settings[${index}][group]`, s.group);
        formData.append(`settings[${index}][type]`, s.type);
        if (s.description) {
          formData.append(`settings[${index}][description]`, s.description);
        }

        // If there's a file selected for this key
        if (files[s.key]) {
          formData.append(`settings[${index}][value]`, files[s.key]);
        } else {
          formData.append(`settings[${index}][value]`, s.value || "");
        }
      });

      await api.post("/api/settings", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Pengaturan berhasil disimpan. Perubahan mungkin membutuhkan refresh untuk terlihat penuh.");

      // Update global CSS var if primary_color changed
      const primaryColor = settings.find(s => s.key === "primary_color")?.value;
      if (primaryColor) {
        document.documentElement.style.setProperty("--primary", primaryColor);
      }
    } catch (err) {
      toast.error("Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string | boolean) => {
    const newSettings = settings.map((s) => {
      if (s.key === key) {
        return { ...s, value: typeof value === "boolean" ? (value ? "true" : "false") : value };
      }
      return s;
    });
    setSettings(newSettings);
  };

  const renderInput = (setting: Setting) => {
    if (setting.type === "boolean") {
      return (
        <div className="flex items-center space-x-2 pt-2">
          <Switch
            checked={setting.value === "true"}
            onCheckedChange={(val) => handleChange(setting.key, val)}
          />
          <span className="text-sm text-muted-foreground">Aktifkan</span>
        </div>
      );
    }

    // Dropdown model AI (preset populer + opsi custom). Tetap sediakan input teks
    // agar Super Admin bisa menempel model id persis dari build.nvidia.com.
    if (setting.key === "ai_model" || setting.key === "ai_model_fallback") {
      const presets = [
        "meta/llama-3.3-70b-instruct",
        "meta/llama-3.1-70b-instruct",
        "meta/llama-3.1-8b-instruct",
        "deepseek-ai/deepseek-v4-pro",
        "nvidia/llama-3.1-nemotron-70b-instruct",
        "qwen/qwen2.5-72b-instruct",
      ];
      const value = setting.value || "";
      const isFallback = setting.key === "ai_model_fallback";
      const isKnown = presets.includes(value) || (value === "" && isFallback);
      return (
        <div className="space-y-2">
          <select
            value={isKnown ? value : "__custom__"}
            onChange={(e) => { if (e.target.value !== "__custom__") handleChange(setting.key, e.target.value); }}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            {isFallback && <option value="">— Tidak ada (nonaktif) —</option>}
            {presets.map((m) => <option key={m} value={m}>{m}</option>)}
            <option value="__custom__">Custom / model id lain…</option>
          </select>
          <Input
            value={value}
            onChange={(e) => handleChange(setting.key, e.target.value)}
            placeholder="atau tempel model id persis dari build.nvidia.com"
          />
        </div>
      );
    }

    const fileKeys = ["app_logo", "app_favicon", "landing_hero_image"];
    if (fileKeys.includes(setting.key)) {
      return (
        <div className="space-y-2">
          {setting.value && !files[setting.key] && (
            <div className="mb-2">
              <img src={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}${setting.value}`} alt={setting.key} className="h-16 object-contain rounded border p-1 bg-slate-50 dark:bg-slate-900" />
            </div>
          )}
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setFiles({ ...files, [setting.key]: e.target.files[0] });
              }
            }}
          />
        </div>
      );
    }

    if (setting.key === "primary_color") {
      return (
        <div className="flex items-center gap-4">
          <Input
            type="color"
            value={setting.value || "#000000"}
            onChange={(e) => handleChange(setting.key, e.target.value)}
            className="w-16 h-10 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={setting.value || ""}
            onChange={(e) => handleChange(setting.key, e.target.value)}
            className="flex-1 font-mono text-sm uppercase"
          />
        </div>
      );
    }

    if (setting.key === "landing_page_template") {
      return (
        <select
          value={setting.value || "acms_default"}
          onChange={(e) => handleChange(setting.key, e.target.value)}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="acms_default">ACMS Full System (Default)</option>
          <option value="incident_reporting">Sistem Pelaporan Insiden Khusus</option>
        </select>
      );
    }

    if (setting.type === "text") {
      return (
        <Textarea
          value={setting.value || ""}
          onChange={(e) => handleChange(setting.key, e.target.value)}
          placeholder={`Masukkan ${setting.key}`}
          rows={4}
        />
      );
    }

    if (setting.type === "password") {
      return (
        <Input
          type="password"
          value={setting.value || ""}
          onChange={(e) => handleChange(setting.key, e.target.value)}
          placeholder={`Masukkan ${setting.key}`}
        />
      );
    }

    if (setting.type === "secret") {
      // Backend mengirim placeholder '__SECRET_SET__' bila key sudah tersimpan
      // (nilai asli tak pernah dikirim ke browser). Kosong = belum diisi.
      const isSet = setting.value === "__SECRET_SET__";
      return (
        <div className="space-y-1.5">
          <Input
            type="password"
            autoComplete="off"
            value={isSet ? "" : (setting.value || "")}
            onChange={(e) => handleChange(setting.key, e.target.value)}
            placeholder={isSet ? "•••••••••• (tersimpan)" : "Tempel API key (mis. nvapi-...)"}
          />
          <p className="text-xs text-muted-foreground">
            {isSet
              ? "✓ Key tersimpan & terenkripsi. Biarkan kosong untuk mempertahankan, atau ketik untuk mengganti."
              : "Disimpan terenkripsi di server; tidak pernah ditampilkan kembali ke browser."}
          </p>
        </div>
      );
    }

    if (setting.type === "json_contacts") {
      let contactsData: Record<string, string>[] = [];
      try {
        contactsData = JSON.parse(setting.value || "[]");
      } catch (e) {}

      const updateContact = (idx: number, field: string, value: string) => {
        const newData = [...contactsData];
        newData[idx][field] = value;
        handleChange(setting.key, JSON.stringify(newData));
      };

      return (
        <div className="space-y-4 pt-2">
          {contactsData.map((contact, idx) => (
            <div key={idx} className="border rounded-md p-3 bg-slate-50/50 dark:bg-slate-900/50 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  const newData = [...contactsData];
                  newData.splice(idx, 1);
                  handleChange(setting.key, JSON.stringify(newData));
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <div className="grid grid-cols-2 gap-3 mr-8">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Nama Kontak / Divisi</label>
                  <Input value={contact.name || ''} onChange={(e) => updateContact(idx, 'name', e.target.value)} className="h-8 text-sm" placeholder="Contoh: Pusat Bantuan Psikologi" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Peran / Deskripsi Singkat</label>
                  <Input value={contact.role || ''} onChange={(e) => updateContact(idx, 'role', e.target.value)} className="h-8 text-sm" placeholder="Contoh: Dukungan Mental" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Nomor Telepon</label>
                  <Input value={contact.phone || ''} onChange={(e) => updateContact(idx, 'phone', e.target.value)} className="h-8 text-sm" placeholder="Contoh: 119 atau +62..." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input value={contact.email || ''} onChange={(e) => updateContact(idx, 'email', e.target.value)} className="h-8 text-sm" placeholder="Contoh: help@acms.edu" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs text-muted-foreground">Link Eksternal (Opsional, cth: link WhatsApp)</label>
                  <Input value={contact.link || ''} onChange={(e) => updateContact(idx, 'link', e.target.value)} className="h-8 text-sm" placeholder="https://wa.me/..." />
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs border-dashed mt-2"
            onClick={() => {
              const newData = [...contactsData, { name: '', role: '', phone: '', email: '', link: '' }];
              handleChange(setting.key, JSON.stringify(newData));
            }}
          >
            <Plus className="w-3 h-3 mr-1" /> Tambah Kontak Baru
          </Button>
        </div>
      );
    }

    if (setting.type === "json_links") {
      let linksData: Record<string, string>[] = [];
      try {
        linksData = JSON.parse(setting.value || "[]");
      } catch (e) {}

      const updateLink = (idx: number, field: string, value: string) => {
        const newData = [...linksData];
        newData[idx][field] = value;
        handleChange(setting.key, JSON.stringify(newData));
      };

      return (
        <div className="space-y-3 pt-2">
          {linksData.map((link, idx) => (
            <div key={idx} className="flex items-end gap-2 border rounded-md p-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="space-y-1 flex-1">
                <label className="text-xs text-muted-foreground">Label</label>
                <Input value={link.label || ''} onChange={(e) => updateLink(idx, 'label', e.target.value)} className="h-8 text-sm" placeholder="Cth: Kebijakan Privasi" />
              </div>
              <div className="space-y-1 flex-1">
                <label className="text-xs text-muted-foreground">URL / Tautan</label>
                <Input value={link.url || ''} onChange={(e) => updateLink(idx, 'url', e.target.value)} className="h-8 text-sm font-mono" placeholder="/safety/sop atau https://..." />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  const newData = [...linksData];
                  newData.splice(idx, 1);
                  handleChange(setting.key, JSON.stringify(newData));
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs border-dashed"
            onClick={() => handleChange(setting.key, JSON.stringify([...linksData, { label: '', url: '' }]))}
          >
            <Plus className="w-3 h-3 mr-1" /> Tambah Tautan
          </Button>
        </div>
      );
    }

    if (setting.type === "json_cards") {
      let cardsData: Record<string, string>[] = [];
      try {
        cardsData = JSON.parse(setting.value || "[]");
      } catch (e) {}

      const updateCard = (idx: number, field: string, value: string) => {
        const newData = [...cardsData];
        newData[idx][field] = value;
        handleChange(setting.key, JSON.stringify(newData));
      };

      return (
        <div className="space-y-3 pt-2">
          {cardsData.map((card, idx) => (
            <div key={idx} className="border rounded-md p-3 bg-slate-50/50 dark:bg-slate-900/50 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  const newData = [...cardsData];
                  newData.splice(idx, 1);
                  handleChange(setting.key, JSON.stringify(newData));
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <div className="space-y-2 mr-8">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Judul Kategori</label>
                  <Input value={card.title || ''} onChange={(e) => updateCard(idx, 'title', e.target.value)} className="h-8 text-sm" placeholder="Cth: Patient Safety" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Deskripsi</label>
                  <Textarea value={card.description || ''} onChange={(e) => updateCard(idx, 'description', e.target.value)} rows={2} className="text-sm" placeholder="Deskripsi singkat kategori ini" />
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs border-dashed"
            onClick={() => handleChange(setting.key, JSON.stringify([...cardsData, { title: '', description: '' }]))}
          >
            <Plus className="w-3 h-3 mr-1" /> Tambah Kategori
          </Button>
        </div>
      );
    }

    if (setting.type === "json_faq") {
      let faqData: Record<string, string>[] = [];
      try {
        faqData = JSON.parse(setting.value || "[]");
      } catch (e) {}

      const updateFaq = (idx: number, field: string, value: string) => {
        const newData = [...faqData];
        newData[idx][field] = value;
        handleChange(setting.key, JSON.stringify(newData));
      };

      return (
        <div className="space-y-3 pt-2">
          {faqData.map((faq, idx) => (
            <div key={idx} className="border rounded-md p-3 bg-slate-50/50 dark:bg-slate-900/50 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  const newData = [...faqData];
                  newData.splice(idx, 1);
                  handleChange(setting.key, JSON.stringify(newData));
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <div className="space-y-2 mr-8">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Pertanyaan</label>
                  <Input value={faq.question || ''} onChange={(e) => updateFaq(idx, 'question', e.target.value)} className="h-8 text-sm" placeholder="Cth: Apakah identitas saya aman?" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Jawaban</label>
                  <Textarea value={faq.answer || ''} onChange={(e) => updateFaq(idx, 'answer', e.target.value)} rows={3} className="text-sm" placeholder="Jawaban atas pertanyaan ini" />
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs border-dashed"
            onClick={() => handleChange(setting.key, JSON.stringify([...faqData, { question: '', answer: '' }]))}
          >
            <Plus className="w-3 h-3 mr-1" /> Tambah Pertanyaan
          </Button>
        </div>
      );
    }

    if (setting.type === "matrix") {
      let matrixData: Record<string, MatrixNode> = {};
      try {
        matrixData = JSON.parse(setting.value || "{}");
      } catch (e) {}

      const labels: Record<string, string> = {
        new_account: "Akun Baru Dibuat",
        reset_password: "Permintaan Reset Password",
        logbook_verified: "Status Logbook Diverifikasi",
        rotation_assigned: "Jadwal Rotasi Klinis Baru",
        grade_published: "Nilai Ujian / Stase Diterbitkan",
        finance_billing: "Tagihan Keuangan Baru",
        incident_reported: "Pelaporan Insiden Baru",
        incident_status_updated: "Status Laporan Insiden Diperbarui (ke pelapor)",
        consultation_submitted: "Konsultasi Baru Masuk",
        consultation_responded: "Konsultasi Dibalas (ke pengaju)"
      };

      const updateMatrixNode = (key: string, field: string, value: unknown) => {
        const newData = { ...matrixData };
        if (!newData[key]) newData[key] = { enabled: false, cc_emails: '', notify_roles: [], conditional_rules: [] };
        newData[key][field] = value;
        handleChange(setting.key, JSON.stringify(newData));
      };

      // Kolom yang bisa dicek per kejadian (untuk aturan bersyarat).
      // Hanya kolom yang BENAR-BENAR dikirim sebagai konteks oleh pemicunya.
      // Tambahkan di sini saat modul lain mulai mengirim konteks tambahan.
      const eventTriggerFields: Record<string, { field: string; label: string }[]> = {
        incident_reported: [{ field: 'incident_type', label: 'Jenis Insiden' }],
        incident_status_updated: [{ field: 'status', label: 'Status Laporan' }],
        consultation_submitted: [{ field: 'category', label: 'Kategori Konsultasi' }],
        consultation_responded: [{ field: 'category', label: 'Kategori Konsultasi' }],
      };

      return (
        <div className="space-y-4 pt-2">
          {/* Panduan singkat */}
          <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-3 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
            <p className="font-semibold">Cara mengisi:</p>
            <p>1. <strong>Centang</strong> kejadian yang ingin memicu email otomatis.</p>
            <p>2. Tentukan penerimanya:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li><strong>Kirim ke Peran</strong> — semua pengguna dengan peran itu (mis. semua &quot;Kaprodi&quot;).</li>
              <li><strong>Email Manual (CC)</strong> — alamat email tertentu di luar peran (mis. komite/satgas).</li>
            </ul>
            <p className="text-blue-700/80 dark:text-blue-300/80">Untuk notifikasi yang ditujukan ke pelapor/pengaju (mis. &quot;Status Diperbarui&quot;, &quot;Konsultasi Dibalas&quot;), orang tersebut sudah otomatis menerima — daftar di sini adalah penerima <em>tambahan</em>.</p>
          </div>

          {Object.entries(labels).map(([key, label]) => {
            const dataNode = matrixData[key] || { enabled: false, cc_emails: '', notify_roles: [], conditional_rules: [] };
            const fieldOptions = eventTriggerFields[key] ?? [];
            const defaultTriggerField = fieldOptions[0]?.field ?? '';

            return (
              <div key={key} className="border rounded-md p-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={dataNode.enabled || false}
                    onCheckedChange={(checked) => updateMatrixNode(key, 'enabled', !!checked)}
                  />
                  <span className="font-semibold text-sm">{label}</span>
                  {!dataNode.enabled && <span className="text-[10px] text-muted-foreground">(nonaktif)</span>}
                </div>

                {dataNode.enabled && (
                  <div className="ml-7 mt-3 space-y-3 border-l-2 pl-3 pb-1 border-primary/20">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Kirim ke Peran (Role)</label>
                      <Input
                        value={(dataNode.notify_roles || []).join(', ')}
                        onChange={(e) => updateMatrixNode(key, 'notify_roles', e.target.value.split(',').map((r: string) => r.trim()).filter((r: string) => r))}
                        placeholder="Kaprodi, Super Admin"
                        className="h-8 text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">Semua pengguna dengan peran ini akan menerima email. Pisahkan beberapa peran dengan koma. Tulis persis nama perannya (lihat halaman Hak Akses/RBAC).</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Kirim ke Email Manual (CC)</label>
                      <Input
                        value={dataNode.cc_emails || ''}
                        onChange={(e) => updateMatrixNode(key, 'cc_emails', e.target.value)}
                        placeholder="admin@acms.edu, dekan@acms.edu"
                        className="h-8 text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">Alamat email tertentu (opsional). Pisahkan dengan koma. Boleh dikosongkan.</p>
                    </div>

                    {/* Aturan bersyarat (lanjutan, disembunyikan secara default) */}
                    <details className="bg-white dark:bg-slate-950 rounded border mt-1">
                      <summary className="text-xs font-semibold cursor-pointer p-2 select-none">
                        Pengaturan Lanjutan: Aturan Bersyarat (opsional)
                      </summary>
                      <div className="p-2 pt-0 space-y-2">
                        <p className="text-[11px] text-muted-foreground">
                          Tambahkan penerima ekstra <strong>hanya jika</strong> sebuah kolom bernilai tertentu.
                          Contoh: kirim CC ke <span className="font-mono">satgas@acms.edu</span> hanya bila <span className="font-mono">{fieldOptions[0]?.label ?? 'kolom tertentu'}</span> = <span className="font-mono">bullying</span>.
                          {fieldOptions.length === 0 && " (Kejadian ini belum menyediakan kolom untuk dicek.)"}
                          {" "}Lewati bagian ini jika tidak diperlukan.
                        </p>
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                            disabled={fieldOptions.length === 0}
                            onClick={() => {
                              const rules = [...(dataNode.conditional_rules || [])];
                              rules.push({ trigger_field: defaultTriggerField, trigger_value: '', additional_cc: '', additional_roles: [] });
                              updateMatrixNode(key, 'conditional_rules', rules);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Tambah Aturan
                          </Button>
                        </div>

                        {(dataNode.conditional_rules || []).length === 0 ? (
                          <div className="text-[10px] text-muted-foreground text-center py-2 italic border-dashed border rounded">
                            Belum ada aturan bersyarat.
                          </div>
                        ) : (
                          (dataNode.conditional_rules || []).map((rule: MatrixRule, idx: number) => (
                            <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 p-2 pt-5 border border-dashed rounded text-xs bg-slate-50 dark:bg-slate-900 relative">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-1 right-1 h-5 w-5 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  const rules = [...(dataNode.conditional_rules || [])];
                                  rules.splice(idx, 1);
                                  updateMatrixNode(key, 'conditional_rules', rules);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>

                              <div>
                                <label className="text-[10px] text-muted-foreground">Kolom yang Dicek</label>
                                {fieldOptions.length > 0 ? (
                                  <Select
                                    value={rule.trigger_field || ""}
                                    onValueChange={(v) => {
                                      const rules = [...(dataNode.conditional_rules || [])];
                                      rules[idx].trigger_field = v ?? "";
                                      rules[idx].trigger_value = ""; // reset nilai karena opsinya berubah
                                      updateMatrixNode(key, 'conditional_rules', rules);
                                    }}
                                  >
                                    <SelectTrigger className="h-6 text-xs px-1 mt-1">
                                      <SelectValue placeholder="Pilih kolom..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {fieldOptions.map((f) => (
                                        <SelectItem key={f.field} value={f.field}>{f.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={rule.trigger_field}
                                    onChange={(e) => {
                                      const rules = [...(dataNode.conditional_rules || [])];
                                      rules[idx].trigger_field = e.target.value;
                                      updateMatrixNode(key, 'conditional_rules', rules);
                                    }}
                                    className="h-6 text-xs px-1 mt-1"
                                    placeholder="incident_type"
                                  />
                                )}
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground">Nilai Pemicu</label>
                                {(triggerRefs[rule.trigger_field ?? ""] && triggerRefs[rule.trigger_field ?? ""].length > 0) ? (
                                  <Select
                                    value={rule.trigger_value || ""}
                                    onValueChange={(v) => {
                                      const rules = [...(dataNode.conditional_rules || [])];
                                      rules[idx].trigger_value = v ?? "";
                                      updateMatrixNode(key, 'conditional_rules', rules);
                                    }}
                                  >
                                    <SelectTrigger className="h-6 text-xs px-1 mt-1">
                                      <SelectValue placeholder="Pilih nilai..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {triggerRefs[rule.trigger_field ?? ""].map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={rule.trigger_value}
                                    onChange={(e) => {
                                      const rules = [...(dataNode.conditional_rules || [])];
                                      rules[idx].trigger_value = e.target.value;
                                      updateMatrixNode(key, 'conditional_rules', rules);
                                    }}
                                    className="h-6 text-xs px-1 mt-1"
                                    placeholder="bullying"
                                  />
                                )}
                              </div>
                              <div className="col-span-2">
                                <label className="text-[10px] text-muted-foreground">CC Email Tambahan (bila kondisi terpenuhi)</label>
                                <Input
                                  value={rule.additional_cc}
                                  onChange={(e) => {
                                    const rules = [...(dataNode.conditional_rules || [])];
                                    rules[idx].additional_cc = e.target.value;
                                    updateMatrixNode(key, 'conditional_rules', rules);
                                  }}
                                  className="h-6 text-xs px-1 mt-1"
                                  placeholder="satgas@acms.edu"
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <Input
        type={setting.type === "integer" ? "number" : "text"}
        value={setting.value || ""}
        onChange={(e) => handleChange(setting.key, e.target.value)}
        placeholder={`Masukkan ${setting.key}`}
      />
    );
  };

  const renderSettingsGrid = (list: Setting[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
      {list.map((setting) => {
        const isTemplateSwitcher = setting.key === "landing_page_template";
        const fullWidth = isTemplateSwitcher || ["matrix", "json_contacts", "text"].includes(setting.type);
        return (
          <div
            key={setting.key}
            className={`space-y-2 rounded-lg border p-4 shadow-sm ${fullWidth ? "md:col-span-2" : ""} ${
              isTemplateSwitcher ? "border-primary/40 bg-primary/5" : "bg-card"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <label className="text-sm font-semibold tracking-tight">
                {setting.description || setting.key}
              </label>
              {INACTIVE_KEYS.includes(setting.key) && (
                <span
                  className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  title="Pengaturan ini tersimpan namun fiturnya belum ditegakkan oleh sistem."
                >
                  Belum aktif
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3 font-mono">{setting.key}</p>
            {renderInput(setting)}
          </div>
        );
      })}
    </div>
  );

  // ---- Derived data ----
  const countFor = (groupId: string) => settings.filter((s) => s.group === groupId).length;
  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;
  const activeMeta = ALL_CATEGORIES.find((c) => c.id === active) ?? ALL_CATEGORIES[0];

  const settingsForCategory = (groupId: string): Setting[] => {
    let list = settings.filter((s) => s.group === groupId);

    // Landing page: show only the settings relevant to the chosen template.
    if (groupId === "landing") {
      const currentTemplate = settings.find((s) => s.key === "landing_page_template")?.value || "acms_default";
      list = currentTemplate === "incident_reporting"
        ? list.filter((s) => s.key === "landing_page_template" || s.key.startsWith("incident_"))
        : list.filter((s) => !s.key.startsWith("incident_"));

      // The template selector controls everything below it, so always pin it to the top
      // regardless of the seeded order (consistent across every template).
      list = [
        ...list.filter((s) => s.key === "landing_page_template"),
        ...list.filter((s) => s.key !== "landing_page_template"),
      ];
    }
    return list;
  };

  const visible: Setting[] = isSearching
    ? settings.filter((s) => s.key.toLowerCase().includes(query) || (s.description || "").toLowerCase().includes(query))
    : settingsForCategory(active);

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (userRole !== "Super Admin") {
    return (
      <Card className="max-w-2xl mx-auto mt-10">
        <CardContent className="p-10 text-center">
          <ShieldCheck className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-20" />
          <h2 className="text-xl font-bold mb-2">Akses Ditolak</h2>
          <p className="text-muted-foreground">Anda tidak memiliki izin untuk mengakses halaman Pengaturan Sistem.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="pb-10">
      {/* Sticky action bar: search + save (works on desktop & mobile) */}
      <div className="sticky top-0 z-20 -mt-2 mb-6 border-b bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Cari pengaturan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <p className="hidden text-xs text-muted-foreground md:block">Semua perubahan disimpan bersamaan.</p>
            <Button onClick={handleSave} disabled={saving} className="shadow-sm">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan Semua
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile category dropdown (hidden while searching) */}
      {!isSearching && (
        <div className="mb-4 lg:hidden">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Kategori Pengaturan</label>
          <select
            value={active}
            onChange={(e) => setActive(e.target.value)}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {SECTIONS.map((section) => {
              const items = section.items.filter((c) => countFor(c.id) > 0);
              if (items.length === 0) return null;
              return (
                <optgroup key={section.label} label={section.label}>
                  {items.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label} ({countFor(cat.id)})
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
      )}

      <div className="flex gap-6">
        {/* Desktop left navigation rail (hidden while searching) */}
        {!isSearching && (
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="sticky top-24 space-y-6">
              {SECTIONS.map((section) => {
                const items = section.items.filter((c) => countFor(c.id) > 0);
                if (items.length === 0) return null;
                return (
                  <div key={section.label}>
                    <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.label}
                    </p>
                    <nav className="space-y-1">
                      {items.map((cat) => {
                        const isActive = active === cat.id;
                        const Icon = cat.icon;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setActive(cat.id)}
                            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                              isActive
                                ? "bg-primary font-medium text-primary-foreground"
                                : "text-foreground hover:bg-muted"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1 text-left">{cat.label}</span>
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                                isActive ? "bg-primary-foreground/20" : "bg-muted-foreground/10 text-muted-foreground"
                              }`}
                            >
                              {countFor(cat.id)}
                            </span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isSearching ? (
                  <>
                    <Search className="h-5 w-5 text-primary" /> Hasil Pencarian
                  </>
                ) : (
                  <>
                    <activeMeta.icon className="h-5 w-5 text-primary" /> {activeMeta.label}
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {isSearching
                  ? `Menampilkan ${visible.length} pengaturan yang cocok dengan "${search}".`
                  : activeMeta.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visible.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {isSearching ? "Tidak ada pengaturan yang cocok." : "Tidak ada pengaturan untuk kategori ini."}
                </div>
              ) : (
                renderSettingsGrid(visible)
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
