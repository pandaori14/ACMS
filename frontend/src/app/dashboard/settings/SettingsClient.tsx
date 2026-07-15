"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
  icon: LucideIcon;
}

interface Section {
  key: string;
  items: Category[];
}

// Navigation grouped into cross-cutting "system" settings and per-module settings.
// Label & deskripsi diambil dari katalog i18n: settingsMain.sections.* & settingsMain.categories.*
const SECTIONS: Section[] = [
  {
    key: "systemGeneral",
    items: [
      { id: "general", icon: MonitorSmartphone },
      { id: "landing", icon: LayoutTemplate },
      { id: "security", icon: ShieldCheck },
      { id: "smtp", icon: Mail },
      { id: "oauth", icon: Key },
      { id: "guide", icon: BookOpen },
      { id: "help", icon: BookOpen },
      { id: "ai_assistant", icon: Bot },
    ],
  },
  {
    key: "perModule",
    items: [
      { id: "academic", icon: GraduationCap },
      { id: "assessment", icon: Scale },
      { id: "clinical", icon: Stethoscope },
      { id: "attendance", icon: MapPin },
      { id: "finance", icon: Landmark },
    ],
  },
];

const ALL_CATEGORIES: Category[] = SECTIONS.flatMap((s) => s.items);

// Kejadian pada matriks notifikasi SMTP (urutan tampil). Label via i18n: settingsMain.matrixLabels.*
const MATRIX_KEYS = [
  "new_account",
  "reset_password",
  "logbook_verified",
  "rotation_assigned",
  "grade_published",
  "finance_billing",
  "incident_reported",
  "incident_status_updated",
  "consultation_submitted",
  "consultation_responded",
];

// Kolom yang bisa dicek per kejadian (untuk aturan bersyarat).
// Hanya kolom yang BENAR-BENAR dikirim sebagai konteks oleh pemicunya.
// Tambahkan di sini saat modul lain mulai mengirim konteks tambahan.
// Label kolom via i18n: settingsMain.triggerFields.*
const EVENT_TRIGGER_FIELDS: Record<string, string[]> = {
  incident_reported: ["incident_type"],
  incident_status_updated: ["status"],
  consultation_submitted: ["category"],
  consultation_responded: ["category"],
};

// Settings that exist in the DB but whose feature is not yet enforced by the backend.
// Shown with a "Belum aktif" badge so the Super Admin is not misled.
// enforce_2fa kini AKTIF (mode lunak): peran admin tanpa 2FA diberi banner wajib-aktifkan.
// allow_student_appeals kini AKTIF: menggate pengajuan banding nilai mahasiswa.
// enable_email_broadcasts kini AKTIF: menggate channel email pada fitur Broadcast.
const INACTIVE_KEYS = [
  "evaluation_required_for_transcript",
  "billing_cycle",
];

export function SettingsClient() {
  const t = useTranslations("settingsMain");
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
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sekali saat mount
  }, []);

  // Status laporan bukan system_reference (enum workflow) → labelnya dari katalog i18n.
  const triggerOptions = useMemo<Record<string, { value: string; name: string }[]>>(
    () => ({
      ...triggerRefs,
      status: [
        { value: "submitted", name: t("statusSubmitted") },
        { value: "investigating", name: t("statusInvestigating") },
        { value: "resolved", name: t("statusResolved") },
      ],
    }),
    [triggerRefs, t]
  );

  const fetchSettings = async () => {
    try {
      const { data } = await api.get("/api/settings");
      setSettings(data);
    } catch (err) {
      toast.error(t("loadError"));
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
      toast.success(t("saveSuccess"));

      // Update global CSS var if primary_color changed
      const primaryColor = settings.find(s => s.key === "primary_color")?.value;
      if (primaryColor) {
        document.documentElement.style.setProperty("--primary", primaryColor);
      }
    } catch (err) {
      toast.error(t("saveError"));
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
          <span className="text-sm text-muted-foreground">{t("enable")}</span>
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
            {isFallback && <option value="">{t("aiNoneOption")}</option>}
            {presets.map((m) => <option key={m} value={m}>{m}</option>)}
            <option value="__custom__">{t("aiCustomOption")}</option>
          </select>
          <Input
            value={value}
            onChange={(e) => handleChange(setting.key, e.target.value)}
            placeholder={t("aiModelPlaceholder")}
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
          <option value="acms_default">{t("templateAcmsDefault")}</option>
          <option value="incident_reporting">{t("templateIncident")}</option>
        </select>
      );
    }

    if (setting.type === "text") {
      return (
        <Textarea
          value={setting.value || ""}
          onChange={(e) => handleChange(setting.key, e.target.value)}
          placeholder={t("enterPlaceholder", { key: setting.key })}
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
          placeholder={t("enterPlaceholder", { key: setting.key })}
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
            placeholder={isSet ? t("secretSavedPlaceholder") : t("secretPlaceholder")}
          />
          <p className="text-xs text-muted-foreground">
            {isSet ? t("secretSavedHint") : t("secretHint")}
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
                  <label className="text-xs text-muted-foreground">{t("contactName")}</label>
                  <Input value={contact.name || ''} onChange={(e) => updateContact(idx, 'name', e.target.value)} className="h-8 text-sm" placeholder={t("contactNamePlaceholder")} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("contactRole")}</label>
                  <Input value={contact.role || ''} onChange={(e) => updateContact(idx, 'role', e.target.value)} className="h-8 text-sm" placeholder={t("contactRolePlaceholder")} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("contactPhone")}</label>
                  <Input value={contact.phone || ''} onChange={(e) => updateContact(idx, 'phone', e.target.value)} className="h-8 text-sm" placeholder={t("contactPhonePlaceholder")} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("contactEmail")}</label>
                  <Input value={contact.email || ''} onChange={(e) => updateContact(idx, 'email', e.target.value)} className="h-8 text-sm" placeholder={t("contactEmailPlaceholder")} />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs text-muted-foreground">{t("contactLink")}</label>
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
            <Plus className="w-3 h-3 mr-1" /> {t("addContact")}
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
                <label className="text-xs text-muted-foreground">{t("linkLabel")}</label>
                <Input value={link.label || ''} onChange={(e) => updateLink(idx, 'label', e.target.value)} className="h-8 text-sm" placeholder={t("linkLabelPlaceholder")} />
              </div>
              <div className="space-y-1 flex-1">
                <label className="text-xs text-muted-foreground">{t("linkUrl")}</label>
                <Input value={link.url || ''} onChange={(e) => updateLink(idx, 'url', e.target.value)} className="h-8 text-sm font-mono" placeholder={t("linkUrlPlaceholder")} />
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
            <Plus className="w-3 h-3 mr-1" /> {t("addLink")}
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
                  <label className="text-xs text-muted-foreground">{t("cardTitle")}</label>
                  <Input value={card.title || ''} onChange={(e) => updateCard(idx, 'title', e.target.value)} className="h-8 text-sm" placeholder={t("cardTitlePlaceholder")} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("cardDesc")}</label>
                  <Textarea value={card.description || ''} onChange={(e) => updateCard(idx, 'description', e.target.value)} rows={2} className="text-sm" placeholder={t("cardDescPlaceholder")} />
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
            <Plus className="w-3 h-3 mr-1" /> {t("addCard")}
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
                  <label className="text-xs text-muted-foreground">{t("faqQuestion")}</label>
                  <Input value={faq.question || ''} onChange={(e) => updateFaq(idx, 'question', e.target.value)} className="h-8 text-sm" placeholder={t("faqQuestionPlaceholder")} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t("faqAnswer")}</label>
                  <Textarea value={faq.answer || ''} onChange={(e) => updateFaq(idx, 'answer', e.target.value)} rows={3} className="text-sm" placeholder={t("faqAnswerPlaceholder")} />
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
            <Plus className="w-3 h-3 mr-1" /> {t("addFaq")}
          </Button>
        </div>
      );
    }

    if (setting.type === "matrix") {
      let matrixData: Record<string, MatrixNode> = {};
      try {
        matrixData = JSON.parse(setting.value || "{}");
      } catch (e) {}

      const updateMatrixNode = (key: string, field: string, value: unknown) => {
        const newData = { ...matrixData };
        if (!newData[key]) newData[key] = { enabled: false, cc_emails: '', notify_roles: [], conditional_rules: [] };
        newData[key][field] = value;
        handleChange(setting.key, JSON.stringify(newData));
      };

      return (
        <div className="space-y-4 pt-2">
          {/* Panduan singkat */}
          <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-3 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
            <p className="font-semibold">{t("guideHow")}</p>
            <p>{t.rich("guideStep1", { b: (c) => <strong>{c}</strong> })}</p>
            <p>{t("guideStep2")}</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>{t.rich("guideBullet1", { b: (c) => <strong>{c}</strong> })}</li>
              <li>{t.rich("guideBullet2", { b: (c) => <strong>{c}</strong> })}</li>
            </ul>
            <p className="text-blue-700/80 dark:text-blue-300/80">{t.rich("guideNote", { em: (c) => <em>{c}</em> })}</p>
          </div>

          {MATRIX_KEYS.map((key) => {
            const label = t(`matrixLabels.${key}`);
            const dataNode = matrixData[key] || { enabled: false, cc_emails: '', notify_roles: [], conditional_rules: [] };
            const fieldOptions = (EVENT_TRIGGER_FIELDS[key] ?? []).map((field) => ({
              field,
              label: t(`triggerFields.${field}`),
            }));
            const defaultTriggerField = fieldOptions[0]?.field ?? '';

            return (
              <div key={key} className="border rounded-md p-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={dataNode.enabled || false}
                    onCheckedChange={(checked) => updateMatrixNode(key, 'enabled', !!checked)}
                  />
                  <span className="font-semibold text-sm">{label}</span>
                  {!dataNode.enabled && <span className="text-[10px] text-muted-foreground">{t("matrixInactive")}</span>}
                </div>

                {dataNode.enabled && (
                  <div className="ml-7 mt-3 space-y-3 border-l-2 pl-3 pb-1 border-primary/20">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">{t("sendToRole")}</label>
                      <Input
                        value={(dataNode.notify_roles || []).join(', ')}
                        onChange={(e) => updateMatrixNode(key, 'notify_roles', e.target.value.split(',').map((r: string) => r.trim()).filter((r: string) => r))}
                        placeholder={t("rolePlaceholder")}
                        className="h-8 text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">{t("roleHelp")}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">{t("sendToCc")}</label>
                      <Input
                        value={dataNode.cc_emails || ''}
                        onChange={(e) => updateMatrixNode(key, 'cc_emails', e.target.value)}
                        placeholder={t("ccPlaceholder")}
                        className="h-8 text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">{t("ccHelp")}</p>
                    </div>

                    {/* Aturan bersyarat (lanjutan, disembunyikan secara default) */}
                    <details className="bg-white dark:bg-slate-950 rounded border mt-1">
                      <summary className="text-xs font-semibold cursor-pointer p-2 select-none">
                        {t("advancedTitle")}
                      </summary>
                      <div className="p-2 pt-0 space-y-2">
                        <p className="text-[11px] text-muted-foreground">
                          {t.rich("condHelp", {
                            field: fieldOptions[0]?.label ?? t("condFieldFallback"),
                            b: (c) => <strong>{c}</strong>,
                            mono: (c) => <span className="font-mono">{c}</span>,
                          })}
                          {fieldOptions.length === 0 && t("condNoField")}
                          {t("condSkip")}
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
                            <Plus className="w-3 h-3 mr-1" /> {t("addRule")}
                          </Button>
                        </div>

                        {(dataNode.conditional_rules || []).length === 0 ? (
                          <div className="text-[10px] text-muted-foreground text-center py-2 italic border-dashed border rounded">
                            {t("noRules")}
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
                                <label className="text-[10px] text-muted-foreground">{t("fieldChecked")}</label>
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
                                      <SelectValue placeholder={t("selectField")} />
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
                                <label className="text-[10px] text-muted-foreground">{t("triggerValue")}</label>
                                {(triggerOptions[rule.trigger_field ?? ""] && triggerOptions[rule.trigger_field ?? ""].length > 0) ? (
                                  <Select
                                    value={rule.trigger_value || ""}
                                    onValueChange={(v) => {
                                      const rules = [...(dataNode.conditional_rules || [])];
                                      rules[idx].trigger_value = v ?? "";
                                      updateMatrixNode(key, 'conditional_rules', rules);
                                    }}
                                  >
                                    <SelectTrigger className="h-6 text-xs px-1 mt-1">
                                      <SelectValue placeholder={t("selectValue")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {triggerOptions[rule.trigger_field ?? ""].map((opt) => (
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
                                <label className="text-[10px] text-muted-foreground">{t("additionalCc")}</label>
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
        placeholder={t("enterPlaceholder", { key: setting.key })}
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
                  title={t("inactiveTitle")}
                >
                  {t("inactiveBadge")}
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
          <h2 className="text-xl font-bold mb-2">{t("accessDenied")}</h2>
          <p className="text-muted-foreground">{t("accessDeniedDesc")}</p>
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
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <p className="hidden text-xs text-muted-foreground md:block">{t("saveHint")}</p>
            <Button onClick={handleSave} disabled={saving} className="shadow-sm">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t("saveAll")}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile category dropdown (hidden while searching) */}
      {!isSearching && (
        <div className="mb-4 lg:hidden">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("mobileCategoryLabel")}</label>
          <select
            value={active}
            onChange={(e) => setActive(e.target.value)}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {SECTIONS.map((section) => {
              const items = section.items.filter((c) => countFor(c.id) > 0);
              if (items.length === 0) return null;
              return (
                <optgroup key={section.key} label={t(`sections.${section.key}`)}>
                  {items.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {t(`categories.${cat.id}.label`)} ({countFor(cat.id)})
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
                  <div key={section.key}>
                    <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t(`sections.${section.key}`)}
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
                            <span className="flex-1 text-left">{t(`categories.${cat.id}.label`)}</span>
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
                    <Search className="h-5 w-5 text-primary" /> {t("searchResults")}
                  </>
                ) : (
                  <>
                    <activeMeta.icon className="h-5 w-5 text-primary" /> {t(`categories.${activeMeta.id}.label`)}
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {isSearching
                  ? t("searchDesc", { count: visible.length, query: search })
                  : t(`categories.${activeMeta.id}.description`)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visible.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {isSearching ? t("noMatch") : t("noCategorySettings")}
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
