"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  CalendarDays,
  Building2,
  Stethoscope,
  FileText,
  Paperclip,
  AlertTriangle,
  Search,
  Loader2,
  ShieldCheck,
  Activity,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Student {
  user: {
    name: string;
    email: string;
  };
}

interface Hospital {
  name: string;
}

interface Stase {
  name: string;
  color_code: string;
}

interface RotationAssignment {
  hospital: Hospital;
  stase: Stase;
}

interface Diagnosis {
  icd_code: string;
  name: string;
}

interface Procedure {
  code: string;
  name: string;
}

interface LogbookEntry {
  id: string;
  student: Student;
  rotation_assignment: RotationAssignment;
  diagnosis: Diagnosis | null;
  procedure: Procedure | null;
  preceptor_feedback: string | null;
  activity_date: string;
  activity_type: string;
  description: string;
  patient_initials: string;
  competency_level: number;
  status: string;
  attachment_path: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type TabKey = "pending" | "verified" | "rejected";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "pending", label: "Menunggu Verifikasi", icon: <Clock className="size-4" /> },
  { key: "verified", label: "Sudah Diverifikasi", icon: <CheckCircle2 className="size-4" /> },
  { key: "rejected", label: "Ditolak", icon: <XCircle className="size-4" /> },
];

const COMPETENCY_LABELS: Record<number, string> = {
  1: "Observasi (Level 1)",
  2: "Melakukan di bawah supervisi (Level 2)",
  3: "Melakukan secara mandiri (Level 3)",
  4: "Mengajarkan (Level 4)",
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  diagnosis: "Diagnosis",
  procedure: "Tindakan",
  consultation: "Konsultasi",
  observation: "Observasi",
  other: "Lainnya",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusBadgeClasses(status: string) {
  switch (status) {
    case "submitted":
    case "pending":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "verified":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "submitted":
    case "pending":
      return "Menunggu";
    case "verified":
      return "Diverifikasi";
    case "rejected":
      return "Ditolak";
    default:
      return status;
  }
}

function competencyColor(level: number) {
  switch (level) {
    case 1:
      return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200";
    case 2:
      return "bg-blue-200 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
    case 3:
      return "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
    case 4:
      return "bg-purple-200 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function LogbookVerificationPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Stats
  const [stats, setStats] = useState({ pending: 0, verified: 0, rejected: 0 });

  // Verify dialog state
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<LogbookEntry | null>(null);
  const [verifyFeedback, setVerifyFeedback] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<LogbookEntry | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectError, setRejectError] = useState("");

  // Verifikasi massal (tab Menunggu)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBatchVerify = async () => {
    if (selectedIds.length === 0) return;
    setBatchLoading(true);
    try {
      const res = await api.post("/api/v1/clinical/logbooks/batch-verify", {
        ids: selectedIds,
        preceptor_feedback: batchFeedback || undefined,
      });
      const { verified, skipped } = res.data.data;
      if (skipped.length > 0) {
        toast.warning(`${verified} diverifikasi, ${skipped.length} dilewati (${skipped[0].reason})`);
      } else {
        toast.success(`${verified} logbook berhasil diverifikasi.`);
      }
      setBatchDialogOpen(false);
      setSelectedIds([]);
      setBatchFeedback("");
      fetchEntries(activeTab);
      fetchStats();
    } catch {
      toast.error("Gagal memverifikasi massal.");
    } finally {
      setBatchLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchEntries = useCallback(async (tab: TabKey) => {
    setLoading(true);
    try {
      let url = "/api/v1/clinical/logbooks";
      if (tab === "pending") url += "?pending_verification=true";
      else if (tab === "verified") url += "?status=verified";
      else url += "?status=rejected";
      const res = await api.get(url);
      setEntries(res.data.data);
    } catch (err) {
      console.error("Gagal memuat data logbook:", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const [pendingRes, verifiedRes, rejectedRes] = await Promise.all([
        api.get("/api/v1/clinical/logbooks?pending_verification=true"),
        api.get("/api/v1/clinical/logbooks?status=verified"),
        api.get("/api/v1/clinical/logbooks?status=rejected"),
      ]);
      setStats({
        pending: pendingRes.data.total || pendingRes.data.data.length,
        verified: verifiedRes.data.total || verifiedRes.data.data.length,
        rejected: rejectedRes.data.total || rejectedRes.data.data.length,
      });
    } catch {
      // Stats are non-critical
    }
  }, []);

  useEffect(() => {
    fetchEntries(activeTab);
    fetchStats();
    setSelectedIds([]); // reset pilihan saat ganti tab
  }, [activeTab, fetchEntries, fetchStats]);

  // ---------------------------------------------------------------------------
  // Verify handler
  // ---------------------------------------------------------------------------

  const openVerifyDialog = (entry: LogbookEntry) => {
    setVerifyTarget(entry);
    setVerifyFeedback("");
    setVerifyDialogOpen(true);
  };

  const handleVerify = async () => {
    if (!verifyTarget) return;
    setVerifyLoading(true);
    try {
      await api.patch(`/api/v1/clinical/logbooks/${verifyTarget.id}/verify`, {
        preceptor_feedback: verifyFeedback || undefined,
      });
      setVerifyDialogOpen(false);
      fetchEntries(activeTab);
      fetchStats();
    } catch (err) {
      console.error("Gagal memverifikasi:", err);
    } finally {
      setVerifyLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Reject handler
  // ---------------------------------------------------------------------------

  const openRejectDialog = (entry: LogbookEntry) => {
    setRejectTarget(entry);
    setRejectFeedback("");
    setRejectError("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectFeedback.trim()) {
      setRejectError("Alasan penolakan wajib diisi.");
      return;
    }
    setRejectLoading(true);
    try {
      await api.patch(`/api/v1/clinical/logbooks/${rejectTarget.id}/reject`, {
        preceptor_feedback: rejectFeedback,
      });
      setRejectDialogOpen(false);
      fetchEntries(activeTab);
      fetchStats();
    } catch (err) {
      console.error("Gagal menolak:", err);
    } finally {
      setRejectLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Filter entries by search
  // ---------------------------------------------------------------------------

  const filteredEntries = entries.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.student.user.name.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.patient_initials.toLowerCase().includes(q) ||
      (e.diagnosis?.name.toLowerCase().includes(q) ?? false) ||
      (e.procedure?.name.toLowerCase().includes(q) ?? false)
    );
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ---- Header ---- */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <ClipboardCheck className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Verifikasi Logbook
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Tinjau dan verifikasi catatan logbook yang dikirimkan oleh mahasiswa.
              </p>
            </div>
          </div>
        </div>

        {/* ---- Statistics Bar ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<Clock className="size-5 text-amber-600" />}
            label="Menunggu"
            count={stats.pending}
            bgClass="bg-amber-50 dark:bg-amber-950/20"
            textClass="text-amber-700 dark:text-amber-400"
          />
          <StatCard
            icon={<CheckCircle2 className="size-5 text-emerald-600" />}
            label="Diverifikasi"
            count={stats.verified}
            bgClass="bg-emerald-50 dark:bg-emerald-950/20"
            textClass="text-emerald-700 dark:text-emerald-400"
          />
          <StatCard
            icon={<XCircle className="size-5 text-red-600" />}
            label="Ditolak"
            count={stats.rejected}
            bgClass="bg-red-50 dark:bg-red-950/20"
            textClass="text-red-700 dark:text-red-400"
          />
        </div>

        {/* ---- Tab Filter + Search ---- */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex gap-1 bg-muted/60 p-1 rounded-xl">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all
                  ${
                    activeTab === tab.key
                      ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  }
                `}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, diagnosa, prosedur..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* ---- Content ---- */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="col-span-full py-20 text-center clean-card border-dashed">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-muted p-4">
                <FileText className="size-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">
                {activeTab === "pending"
                  ? "Tidak ada logbook yang menunggu verifikasi"
                  : activeTab === "verified"
                  ? "Belum ada logbook yang diverifikasi"
                  : "Tidak ada logbook yang ditolak"}
              </h3>
              <p className="text-muted-foreground text-sm max-w-md">
                {activeTab === "pending"
                  ? "Semua logbook telah diproses. Cek kembali nanti untuk entri baru."
                  : "Entri akan muncul di sini setelah diproses."}
              </p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === "pending" && filteredEntries.length > 1 && (
              <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-blue-900"
                  checked={selectedIds.length === filteredEntries.length}
                  onChange={(e) =>
                    setSelectedIds(e.target.checked ? filteredEntries.map((x) => x.id) : [])
                  }
                />
                Pilih semua ({filteredEntries.length}) untuk verifikasi massal
              </label>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="relative">
                  {activeTab === "pending" && (
                    <label
                      className="absolute -top-2 -left-2 z-10 bg-white dark:bg-slate-900 border rounded-md p-1.5 shadow-sm cursor-pointer"
                      title="Pilih untuk verifikasi massal"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-blue-900 block"
                        checked={selectedIds.includes(entry.id)}
                        onChange={() => toggleSelect(entry.id)}
                      />
                    </label>
                  )}
                  <EntryCard
                    entry={entry}
                    activeTab={activeTab}
                    onVerify={() => openVerifyDialog(entry)}
                    onReject={() => openRejectDialog(entry)}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* ---- Bulk bar verifikasi massal ---- */}
        {selectedIds.length > 0 && activeTab === "pending" && (
          <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-blue-900 text-white rounded-full shadow-lg px-5 py-2.5 flex items-center gap-3">
            <span className="text-sm font-medium">{selectedIds.length} dipilih</span>
            <Button
              size="sm"
              className="bg-white text-blue-900 hover:bg-blue-50 rounded-full h-8"
              onClick={() => setBatchDialogOpen(true)}
            >
              <ShieldCheck className="size-4 mr-1" /> Verifikasi Massal
            </Button>
            <button
              className="text-blue-200 hover:text-white text-sm"
              onClick={() => setSelectedIds([])}
            >
              Batal
            </button>
          </div>
        )}

        {/* ---- Dialog verifikasi massal ---- */}
        <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-600" />
                Verifikasi {selectedIds.length} Logbook Sekaligus
              </DialogTitle>
              <DialogDescription>
                Semua logbook terpilih akan diverifikasi atas nama Anda. Entri di luar
                cakupan RS Anda otomatis dilewati dan dilaporkan.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Umpan Balik Massal <span className="text-muted-foreground font-normal">(opsional, berlaku ke semua)</span>
              </label>
              <textarea
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground min-h-[80px] resize-y"
                placeholder="Contoh: Kegiatan sesuai dan terdokumentasi baik."
                value={batchFeedback}
                onChange={(e) => setBatchFeedback(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>Batal</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={batchLoading}
                onClick={handleBatchVerify}
              >
                {batchLoading ? "Memproses..." : `Verifikasi ${selectedIds.length} Logbook`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---- Verify Dialog ---- */}
        <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-600" />
                Verifikasi Logbook
              </DialogTitle>
              <DialogDescription>
                Anda akan menyetujui logbook milik{" "}
                <span className="font-semibold text-foreground">
                  {verifyTarget?.student.user.name}
                </span>
                . Tambahkan catatan umpan balik jika diperlukan.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Umpan Balik{" "}
                <span className="text-muted-foreground font-normal">(opsional)</span>
              </label>
              <textarea
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 min-h-[80px] resize-y"
                placeholder="Tuliskan catatan untuk mahasiswa..."
                value={verifyFeedback}
                onChange={(e) => setVerifyFeedback(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setVerifyDialogOpen(false)}
                disabled={verifyLoading}
              >
                Batal
              </Button>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={handleVerify}
                disabled={verifyLoading}
              >
                {verifyLoading && <Loader2 className="size-4 animate-spin" />}
                Verifikasi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---- Reject Dialog ---- */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-red-600" />
                Tolak Logbook
              </DialogTitle>
              <DialogDescription>
                Anda akan menolak logbook milik{" "}
                <span className="font-semibold text-foreground">
                  {rejectTarget?.student.user.name}
                </span>
                . Alasan penolakan <span className="text-red-600 font-semibold">wajib</span>{" "}
                diisi agar mahasiswa mengetahui hal yang perlu diperbaiki.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Alasan Penolakan <span className="text-red-500">*</span>
              </label>
              <textarea
                className={`flex w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 min-h-[100px] resize-y ${
                  rejectError
                    ? "border-red-500 ring-3 ring-red-500/20"
                    : "border-input"
                }`}
                placeholder="Jelaskan alasan penolakan..."
                value={rejectFeedback}
                onChange={(e) => {
                  setRejectFeedback(e.target.value);
                  if (e.target.value.trim()) setRejectError("");
                }}
              />
              {rejectError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="size-3.5" />
                  {rejectError}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRejectDialogOpen(false)}
                disabled={rejectLoading}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectLoading}
              >
                {rejectLoading && <Loader2 className="size-4 animate-spin" />}
                Tolak Logbook
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  count,
  bgClass,
  textClass,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  bgClass: string;
  textClass: string;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl p-4 ring-1 ring-foreground/5 ${bgClass}`}
    >
      <div className="rounded-lg bg-background/80 p-2 shadow-sm">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${textClass}`}>{count}</p>
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  activeTab,
  onVerify,
  onReject,
}: {
  entry: LogbookEntry;
  activeTab: TabKey;
  onVerify: () => void;
  onReject: () => void;
}) {
  const staseColor = entry.rotation_assignment?.stase?.color_code || "#6366f1";

  return (
    <div className="group relative flex flex-col rounded-xl border bg-card text-card-foreground ring-1 ring-foreground/5 hover:shadow-lg hover:ring-foreground/10 transition-all duration-200">
      {/* Colored top accent bar */}
      <div
        className="h-1 rounded-t-xl"
        style={{ backgroundColor: staseColor }}
      />

      <div className="flex flex-col gap-4 p-5">
        {/* ---- Row 1: Student + Status ---- */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
              {entry.student.user.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {entry.student.user.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {entry.student.user.email}
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClasses(
              entry.status
            )}`}
          >
            {entry.status === "verified" && <CheckCircle2 className="size-3" />}
            {(entry.status === "submitted" || entry.status === "pending") && (
              <Clock className="size-3" />
            )}
            {entry.status === "rejected" && <XCircle className="size-3" />}
            {statusLabel(entry.status)}
          </span>
        </div>

        {/* ---- Row 2: Meta info ---- */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {formatDate(entry.activity_date)}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: staseColor + "20",
              color: staseColor,
            }}
          >
            <Stethoscope className="size-3" />
            {entry.rotation_assignment?.stase?.name ?? "-"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Building2 className="size-3.5" />
            {entry.rotation_assignment?.hospital?.name ?? "-"}
          </span>
        </div>

        {/* Activity type badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
            <Activity className="size-3" />
            {ACTIVITY_TYPE_LABELS[entry.activity_type] ?? entry.activity_type}
          </span>
          {entry.patient_initials && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <User className="size-3" />
              Pasien: {entry.patient_initials}
            </span>
          )}
        </div>

        {/* ---- Row 3: Description ---- */}
        <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
          {entry.description}
        </p>

        {/* ---- Row 4: Diagnosis / Procedure ---- */}
        {(entry.diagnosis || entry.procedure) && (
          <div className="flex flex-col gap-1.5 text-xs">
            {entry.diagnosis && (
              <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {entry.diagnosis.icd_code}
                </span>
                <span>{entry.diagnosis.name}</span>
              </div>
            )}
            {entry.procedure && (
              <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="rounded bg-violet-100 px-1.5 py-0.5 font-mono text-[10px] text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                  {entry.procedure.code}
                </span>
                <span>{entry.procedure.name}</span>
              </div>
            )}
          </div>
        )}

        {/* ---- Row 5: Competency + Attachment ---- */}
        <div className="flex items-center justify-between gap-2">
          <Tooltip>
            <TooltipTrigger
              className={`inline-flex items-center justify-center size-7 rounded-full text-xs font-bold cursor-default ${competencyColor(
                entry.competency_level
              )}`}
            >
              {entry.competency_level}
            </TooltipTrigger>
            <TooltipContent>
              {COMPETENCY_LABELS[entry.competency_level] ?? `Level ${entry.competency_level}`}
            </TooltipContent>
          </Tooltip>

          {entry.attachment_path && (
            <a
              href={`/storage/${entry.attachment_path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Paperclip className="size-3.5" />
              Lampiran
            </a>
          )}
        </div>

        {/* ---- Row 6: Feedback (for verified/rejected) ---- */}
        {entry.preceptor_feedback && activeTab !== "pending" && (
          <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground border border-foreground/5">
            <p className="font-medium text-foreground mb-1">Umpan Balik Dosen:</p>
            <p className="leading-relaxed">{entry.preceptor_feedback}</p>
          </div>
        )}
      </div>

      {/* ---- Footer Actions ---- */}
      {activeTab === "pending" && (
        <div className="flex items-center gap-2 border-t bg-muted/30 px-5 py-3 rounded-b-xl">
          <Button
            className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5"
            size="sm"
            onClick={onVerify}
          >
            <CheckCircle2 className="size-4" />
            Verifikasi
          </Button>
          <Button
            variant="destructive"
            className="flex-1 gap-1.5"
            size="sm"
            onClick={onReject}
          >
            <XCircle className="size-4" />
            Tolak
          </Button>
        </div>
      )}
    </div>
  );
}
