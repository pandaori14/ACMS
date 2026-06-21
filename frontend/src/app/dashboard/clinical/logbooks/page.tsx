"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  BookOpenText,
  FileEdit,
  Send,
  CheckCircle2,
  XCircle,
  Trash2,
  ClipboardList,
  Stethoscope,
  Activity,
  ShieldAlert,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";

// ───────────────────────────── Types ─────────────────────────────

interface Diagnosis {
  id: string;
  icd_code: string;
  name: string;
}

interface Procedure {
  id: string;
  code: string;
  name: string;
}

interface RotationAssignment {
  id: string;
  hospital: { id: string; name: string };
  stase: { id: string; name: string; color_code: string | null };
}

interface LogbookEntry {
  id: string;
  activity_date: string;
  activity_type: "case" | "procedure" | "duty";
  description: string;
  patient_initials: string | null;
  medical_record_no: string | null;
  competency_level: "1" | "2" | "3" | "4" | null;
  status: "draft" | "submitted" | "verified" | "rejected";
  attachment: string | null;
  student: { user: { name: string; email: string } };
  rotationAssignment: {
    hospital: { name: string };
    stase: { name: string; color_code: string | null };
  };
  diagnosis: Diagnosis | null;
  procedure: Procedure | null;
  preceptor: { name: string } | null;
  preceptor_feedback: string | null;
  created_at: string;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ───────────────────────────── Constants ─────────────────────────────

const ACTIVITY_TYPE_MAP: Record<string, { label: string; icon: typeof ClipboardList; color: string }> = {
  case: { label: "Kasus Pasien", icon: Stethoscope, color: "text-blue-600 bg-blue-50" },
  procedure: { label: "Tindakan", icon: Activity, color: "text-purple-600 bg-purple-50" },
  duty: { label: "Jaga", icon: ShieldAlert, color: "text-orange-600 bg-orange-50" },
};

const COMPETENCY_LABELS: Record<string, string> = {
  "1": "Level 1 — Observasi",
  "2": "Level 2 — Asisten",
  "3": "Level 3 — Supervisi",
  "4": "Level 4 — Mandiri",
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof FileEdit }> = {
  draft: { label: "Draf", className: "bg-gray-100 text-gray-700 ring-gray-300", icon: FileEdit },
  submitted: { label: "Menunggu Verifikasi", className: "bg-amber-50 text-amber-700 ring-amber-300", icon: Send },
  verified: { label: "Diverifikasi", className: "bg-emerald-50 text-emerald-700 ring-emerald-300", icon: CheckCircle2 },
  rejected: { label: "Ditolak", className: "bg-red-50 text-red-700 ring-red-300", icon: XCircle },
};

// ───────────────────────────── Component ─────────────────────────────

export default function LogbooksPage() {
  // Data state
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Form reference data
  const [assignments, setAssignments] = useState<RotationAssignment[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [diagnosisSearch, setDiagnosisSearch] = useState("");
  const [searchingDiagnosis, setSearchingDiagnosis] = useState(false);

  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    rotation_assignment_id: "",
    activity_date: "",
    activity_type: "" as "" | "case" | "procedure" | "duty",
    description: "",
    patient_initials: "",
    medical_record_no: "",
    diagnosis_id: "",
    procedure_id: "",
    competency_level: "" as "" | "1" | "2" | "3" | "4",
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const diagnosisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stats
  const [stats, setStats] = useState({ draft: 0, submitted: 0, verified: 0, rejected: 0 });

  // ─────────── Fetch logbooks ───────────
  const fetchEntries = useCallback(async (p: number = 1, search: string = "") => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/clinical/logbooks", { params: { page: p, search } });
      setEntries(res.data.data);
      
      // Laravel LengthAwarePaginator puts pagination info at root when directly JSON serialized
      setMeta({
        current_page: res.data.current_page,
        last_page: res.data.last_page,
        per_page: res.data.per_page,
        total: res.data.total
      });

      // Compute stats from full data (if backend provides) or from current page
      const all: LogbookEntry[] = res.data.data;
      const s = { draft: 0, submitted: 0, verified: 0, rejected: 0 };
      all.forEach((e) => {
        if (s[e.status] !== undefined) s[e.status]++;
      });
      // If meta has total, keep it. Otherwise use page stats.
      setStats(s);
    } catch (err) {
      console.error("Failed to load logbooks", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─────────── Fetch reference data ───────────
  const fetchReferenceData = useCallback(async () => {
    try {
      const [assignRes, procRes] = await Promise.all([
        api.get("/api/v1/rotation/assignments"),
        api.get("/api/v1/clinical/procedures"),
      ]);
      setAssignments(assignRes.data.data);
      setProcedures(procRes.data.data);
    } catch (err) {
      console.error("Failed to load reference data", err);
    }
  }, []);

  // ─────────── Diagnosis search with debounce ───────────
  const searchDiagnoses = useCallback(async (query: string) => {
    if (query.length < 2) {
      setDiagnoses([]);
      return;
    }
    setSearchingDiagnosis(true);
    try {
      const res = await api.get("/api/v1/clinical/diagnoses", { params: { search: query } });
      setDiagnoses(res.data.data);
    } catch (err) {
      console.error("Diagnosis search failed", err);
    } finally {
      setSearchingDiagnosis(false);
    }
  }, []);

  const handleDiagnosisSearchChange = (value: string) => {
    setDiagnosisSearch(value);
    if (diagnosisTimeoutRef.current) clearTimeout(diagnosisTimeoutRef.current);
    diagnosisTimeoutRef.current = setTimeout(() => searchDiagnoses(value), 400);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchEntries(page, searchQuery);
    }, 400);
    return () => clearTimeout(timeout);
  }, [page, searchQuery, fetchEntries]);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  // ─────────── Form handlers ───────────
  const resetForm = () => {
    setFormData({
      rotation_assignment_id: "",
      activity_date: "",
      activity_type: "",
      description: "",
      patient_initials: "",
      medical_record_no: "",
      diagnosis_id: "",
      procedure_id: "",
      competency_level: "",
    });
    setAttachment(null);
    setDiagnosisSearch("");
    setDiagnoses([]);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setFormError("Format file harus JPG, PNG, atau PDF.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Ukuran file maksimal 5MB.");
      e.target.value = "";
      return;
    }
    setFormError(null);
    setAttachment(file);
  };

  const handleSubmit = async (status: "draft" | "submitted") => {
    if (!formData.rotation_assignment_id || !formData.activity_date || !formData.activity_type || !formData.description.trim()) {
      setFormError("Harap isi semua field yang wajib diisi.");
      return;
    }
    if (formData.description.length > 2000) {
      setFormError("Deskripsi maksimal 2000 karakter.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const fd = new FormData();
      fd.append("rotation_assignment_id", formData.rotation_assignment_id);
      fd.append("activity_date", formData.activity_date);
      fd.append("activity_type", formData.activity_type);
      fd.append("description", formData.description);
      fd.append("status", status);

      if (formData.patient_initials) fd.append("patient_initials", formData.patient_initials);
      if (formData.medical_record_no) fd.append("medical_record_no", formData.medical_record_no);
      if (formData.diagnosis_id) fd.append("diagnosis_id", formData.diagnosis_id);
      if (formData.procedure_id) fd.append("procedure_id", formData.procedure_id);
      if (formData.competency_level) fd.append("competency_level", formData.competency_level);
      if (attachment) fd.append("attachment", attachment);

      await api.post("/api/v1/clinical/logbooks", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setIsOpen(false);
      resetForm();
      fetchEntries(page);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || "Gagal menyimpan entry logbook.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus entry ini?")) return;
    try {
      await api.delete(`/api/v1/clinical/logbooks/${id}`);
      fetchEntries(page);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // ─────────── Render helpers ───────────
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config.className}`}>
        <config.icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const ActivityBadge = ({ type }: { type: string }) => {
    const config = ACTIVITY_TYPE_MAP[type];
    if (!config) return <span className="text-xs">{type}</span>;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${config.color}`}>
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </span>
    );
  };

  // ─────────── Stats Cards ───────────
  const statsCards = [
    { key: "draft", label: "Draf", icon: FileEdit, value: stats.draft, gradient: "from-gray-500 to-gray-600", bg: "bg-gray-50", border: "border-gray-200" },
    { key: "submitted", label: "Menunggu", icon: Send, value: stats.submitted, gradient: "from-amber-500 to-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    { key: "verified", label: "Diverifikasi", icon: CheckCircle2, value: stats.verified, gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    { key: "rejected", label: "Ditolak", icon: XCircle, value: stats.rejected, gradient: "from-red-500 to-red-600", bg: "bg-red-50", border: "border-red-200" },
  ];

  return (
    <div className="min-h-screen">
      {/* ───── Gradient Header ───── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 px-8 py-10 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA3KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNhKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
              <BookOpenText className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Logbook Klinis</h1>
              <p className="mt-1 text-blue-100">Catat dan kelola aktivitas klinis Anda selama rotasi.</p>
            </div>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger
              render={
                <Button className="gap-2 bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-lg shadow-blue-900/20">
                  <Plus className="h-4 w-4" />
                  Tambah Entry
                </Button>
              }
            />
            {/* ───── Create Entry Dialog ───── */}
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <BookOpenText className="h-5 w-5 text-blue-600" />
                  Tambah Entry Logbook
                </DialogTitle>
              </DialogHeader>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="space-y-5">
                {/* Row 1: Assignment + Date */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>
                      Penugasan Rotasi <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.rotation_assignment_id}
                      onValueChange={(val) => setFormData({ ...formData, rotation_assignment_id: val ?? "" })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih penugasan..." />
                      </SelectTrigger>
                      <SelectContent>
                        {assignments.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.stase.name} — {a.hospital.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Tanggal Aktivitas <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={formData.activity_date}
                      onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })}
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>

                {/* Row 2: Activity Type */}
                <div className="space-y-2">
                  <Label>
                    Tipe Aktivitas <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.activity_type}
                    onValueChange={(val) => setFormData({ ...formData, activity_type: (val ?? "") as "case" | "procedure" | "duty" })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih tipe aktivitas..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="case">
                        <Stethoscope className="h-4 w-4 text-blue-500" />
                        Kasus Pasien
                      </SelectItem>
                      <SelectItem value="procedure">
                        <Activity className="h-4 w-4 text-purple-500" />
                        Tindakan
                      </SelectItem>
                      <SelectItem value="duty">
                        <ShieldAlert className="h-4 w-4 text-orange-500" />
                        Jaga
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Row 3: Description */}
                <div className="space-y-2">
                  <Label>
                    Deskripsi <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                    placeholder="Deskripsikan aktivitas klinis Anda secara detail..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.description.length}/2000 karakter
                  </p>
                </div>

                {/* Row 4: Patient info */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Inisial Pasien</Label>
                    <Input
                      placeholder="cth. AB"
                      value={formData.patient_initials}
                      onChange={(e) => setFormData({ ...formData, patient_initials: e.target.value })}
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>No. Rekam Medis</Label>
                    <Input
                      placeholder="cth. RM-000123"
                      value={formData.medical_record_no}
                      onChange={(e) => setFormData({ ...formData, medical_record_no: e.target.value })}
                      maxLength={50}
                    />
                  </div>
                </div>

                {/* Row 5: Diagnosis search */}
                <div className="space-y-2">
                  <Label>Diagnosis (ICD)</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      className="pl-9"
                      placeholder="Cari diagnosis... (min. 2 karakter)"
                      value={diagnosisSearch}
                      onChange={(e) => handleDiagnosisSearchChange(e.target.value)}
                    />
                  </div>
                  {searchingDiagnosis && (
                    <p className="text-xs text-muted-foreground animate-pulse">Mencari...</p>
                  )}
                  {diagnoses.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-lg border bg-popover shadow-sm">
                      {diagnoses.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, diagnosis_id: d.id });
                            setDiagnosisSearch(`${d.icd_code} — ${d.name}`);
                            setDiagnoses([]);
                          }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${formData.diagnosis_id === d.id ? "bg-accent" : ""}`}
                        >
                          <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{d.icd_code}</span>
                          <span className="truncate">{d.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Row 6: Procedure + Competency */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Prosedur / Tindakan</Label>
                    <Select
                      value={formData.procedure_id}
                      onValueChange={(val) => setFormData({ ...formData, procedure_id: val ?? "" })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih prosedur..." />
                      </SelectTrigger>
                      <SelectContent>
                        {procedures.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-mono text-xs text-muted-foreground">{p.code}</span>{" "}
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tingkat Kompetensi</Label>
                    <Select
                      value={formData.competency_level}
                      onValueChange={(val) => setFormData({ ...formData, competency_level: (val ?? "") as "1" | "2" | "3" | "4" })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih level..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">
                          <Eye className="h-4 w-4 text-gray-500" />
                          Level 1 — Observasi
                        </SelectItem>
                        <SelectItem value="2">
                          <ClipboardList className="h-4 w-4 text-blue-500" />
                          Level 2 — Asisten
                        </SelectItem>
                        <SelectItem value="3">
                          <Stethoscope className="h-4 w-4 text-amber-500" />
                          Level 3 — Supervisi
                        </SelectItem>
                        <SelectItem value="4">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          Level 4 — Mandiri
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 7: File Upload */}
                <div className="space-y-2">
                  <Label>Lampiran</Label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-blue-400 hover:bg-blue-50/50">
                        <Upload className="h-5 w-5" />
                        <span>{attachment ? attachment.name : "Pilih file (JPG, PNG, PDF — maks 5MB)"}</span>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileChange}
                      />
                    </label>
                    {attachment && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setAttachment(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <XCircle className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleSubmit("draft")}
                  disabled={submitting}
                >
                  <FileEdit className="h-4 w-4" />
                  Simpan Draf
                </Button>
                <Button
                  className="gap-2"
                  onClick={() => handleSubmit("submitted")}
                  disabled={submitting}
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Menyimpan..." : "Kirim untuk Verifikasi"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* ───── Stats Cards ───── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statsCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.key}
                className={`relative overflow-hidden rounded-xl border ${card.border} ${card.bg} p-5 transition-shadow hover:shadow-md`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                    <div className="mt-1 text-3xl font-bold tracking-tight">
                      {loading ? <Skeleton className="h-9 w-12" /> : card.value}
                    </div>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ───── Entries Table ───── */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Daftar Entry Logbook</h2>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari logbook..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1); // Reset to page 1 on search
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {meta ? `${meta.total} entry ditemukan` : "Memuat data..."}
            </p>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 mb-4">
                <BookOpenText className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold">Belum Ada Entry</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Mulai catat aktivitas klinis Anda dengan menekan tombol &ldquo;Tambah Entry&rdquo; di atas.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto w-full">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead className="min-w-[250px]">Deskripsi</TableHead>
                      <TableHead>Stase</TableHead>
                      <TableHead>RS</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id} className="group">
                        <TableCell className="font-medium text-sm whitespace-nowrap">
                          {formatDate(entry.activity_date)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <ActivityBadge type={entry.activity_type} />
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[300px]">
                            <p className="truncate text-sm">{entry.description}</p>
                            {entry.diagnosis && (
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                <span className="font-mono text-blue-600">{entry.diagnosis.icd_code}</span>{" "}
                                {entry.diagnosis.name}
                              </p>
                            )}
                            {entry.competency_level && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                🎯 {COMPETENCY_LABELS[entry.competency_level]}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {entry.rotationAssignment?.stase && (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                              style={{
                                backgroundColor: entry.rotationAssignment.stase.color_code
                                  ? `${entry.rotationAssignment.stase.color_code}18`
                                  : "#f1f5f9",
                                color: entry.rotationAssignment.stase.color_code || "#475569",
                              }}
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.rotationAssignment.stase.color_code || "#94a3b8" }}
                              />
                              {entry.rotationAssignment.stase.name}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {entry.rotationAssignment?.hospital?.name || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <StatusBadge status={entry.status} />
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {entry.status === "draft" && (
                              <Button
                                variant="destructive"
                                size="icon-sm"
                                onClick={() => handleDelete(entry.id)}
                                title="Hapus entry"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                          {/* Always show for mobile (since no hover) */}
                          {entry.status === "draft" && (
                            <div className="flex items-center justify-end gap-1 sm:hidden mt-1">
                              <Button
                                variant="destructive"
                                size="icon-sm"
                                onClick={() => handleDelete(entry.id)}
                                title="Hapus entry"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {meta && meta.last_page > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    Halaman {meta.current_page} dari {meta.last_page}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={meta.current_page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={meta.current_page >= meta.last_page}
                      onClick={() => setPage((p) => p + 1)}
                      className="gap-1"
                    >
                      Selanjutnya
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
