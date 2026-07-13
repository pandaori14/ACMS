"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Cohort, Program, Student } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReferenceItem {
  id: string;
  name: string;
  value: string;
}

interface StudentForm {
  name: string;
  email: string;
  identity_number: string;
  password: string;
  program_id: string;
  cohort_id: string;
  status: string;
  enrollment_date: string;
}

interface ImportSkipped {
  row: number;
  reason: string;
}

interface ImportResult {
  created: number;
  skipped: ImportSkipped[];
}

const EMPTY_FORM: StudentForm = {
  name: "",
  email: "",
  identity_number: "",
  password: "",
  program_id: "",
  cohort_id: "",
  status: "active",
  enrollment_date: new Date().toISOString().slice(0, 10),
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  leave: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  graduated: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  dropout: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

export default function StudentManagement() {
  const t = useTranslations("academicStudents");
  const tc = useTranslations("common");
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [statuses, setStatuses] = useState<ReferenceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & pagination
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterProgram, setFilterProgram] = useState("");
  const [filterCohort, setFilterCohort] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0 });

  // Dialog CRUD
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StudentForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog hapus
  const [deleting, setDeleting] = useState<Student | null>(null);

  // Dialog ubah status (transisi ber-alasan → audit + notifikasi)
  const [statusTarget, setStatusTarget] = useState<Student | null>(null);
  const [statusValue, setStatusValue] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Dialog import
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importProgram, setImportProgram] = useState("");
  const [importCohort, setImportCohort] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/v1/academic/students", {
        params: {
          page,
          per_page: 15,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(filterProgram ? { program_id: filterProgram } : {}),
          ...(filterCohort ? { cohort_id: filterCohort } : {}),
          ...(filterStatus ? { status: filterStatus } : {}),
        },
      });
      setStudents(res.data.data || []);
      setMeta({
        last_page: res.data.meta?.last_page ?? 1,
        total: res.data.meta?.total ?? 0,
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("loadError")));
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, filterProgram, filterCohort, filterStatus, t]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Debounce pencarian — tunggu 400ms setelah ketikan terakhir
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [progRes, cohortRes, statusRes] = await Promise.all([
          api.get("/api/v1/academic/programs"),
          api.get("/api/v1/academic/cohorts"),
          api.get("/api/references/student_statuses"),
        ]);
        setPrograms(progRes.data.data || []);
        setCohorts(cohortRes.data.data || []);
        setStatuses(statusRes.data.data || []);
      } catch {
        // dropdown kosong masih bisa dipakai untuk melihat daftar
      }
    };
    loadMasters();
  }, []);

  const statusLabel = (value?: string) =>
    statuses.find((s) => s.value === value)?.name || value || "-";

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditingId(s.id);
    setForm({
      name: s.user?.name || "",
      email: s.user?.email || "",
      identity_number: s.user?.identity_number || "",
      password: "",
      program_id: s.program_id || s.program?.id || "",
      cohort_id: s.cohort_id || s.cohort?.id || "",
      status: s.status || "active",
      enrollment_date: (s.enrollment_date || "").slice(0, 10),
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: Record<string, string> = { ...form };
      if (!payload.password) delete payload.password;

      if (editingId) {
        await api.put(`/api/v1/academic/students/${editingId}`, payload);
        toast.success(t("updated"));
      } else {
        await api.post("/api/v1/academic/students", payload);
        toast.success(t("created"));
      }
      setIsFormOpen(false);
      fetchStudents();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("saveError")));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusTarget) return;
    setIsChangingStatus(true);
    try {
      await api.post(`/api/v1/academic/students/${statusTarget.id}/status`, {
        status: statusValue,
        reason: statusReason,
      });
      toast.success(t("statusChanged"));
      setStatusTarget(null);
      fetchStudents();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("statusChangeError")));
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/api/v1/academic/students/${deleting.id}`);
      toast.success(t("deleted"));
      setDeleting(null);
      fetchStudents();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("deleteError")));
      setDeleting(null);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      fd.append("program_id", importProgram);
      fd.append("cohort_id", importCohort);
      const res = await api.post("/api/v1/academic/students/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(res.data.data);
      toast.success(res.data.message);
      fetchStudents();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("importError")));
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get("/api/v1/academic/students/import-template", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template-import-mahasiswa.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("templateError")));
    }
  };

  const resetImportDialog = (open: boolean) => {
    setIsImportOpen(open);
    if (!open) {
      setImportFile(null);
      setImportResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {t("title")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => resetImportDialog(true)}>
            <Upload className="w-4 h-4 mr-2" /> {t("importExcel")}
          </Button>
          <Button onClick={openCreate} className="bg-blue-900 hover:bg-blue-800 text-white">
            <Plus className="w-4 h-4 mr-2" /> {t("addStudent")}
          </Button>
        </div>
      </div>

      {/* Toolbar filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className={selectClass}
          value={filterProgram}
          onChange={(e) => {
            setFilterProgram(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("allPrograms")}</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          className={selectClass}
          value={filterCohort}
          onChange={(e) => {
            setFilterCohort(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("allCohorts")}</option>
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className={selectClass}
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("allStatuses")}</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.value}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="rounded-md border bg-white dark:bg-gray-900 overflow-x-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>{t("nim")}</TableHead>
              <TableHead>{tc("name")}</TableHead>
              <TableHead>{t("email")}</TableHead>
              <TableHead>{t("program")}</TableHead>
              <TableHead>{t("cohort")}</TableHead>
              <TableHead>{tc("status")}</TableHead>
              <TableHead className="text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-10">
                  {t("loadingStudents")}
                </TableCell>
              </TableRow>
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Users className="w-10 h-10 text-slate-300" />
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">
                        {t("emptyTitle")}
                      </p>
                      <p className="text-sm text-slate-500">
                        {t("emptyDesc")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => resetImportDialog(true)}>
                        <Upload className="w-4 h-4 mr-2" /> {t("importExcel")}
                      </Button>
                      <Button size="sm" onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-2" /> {t("addStudent")}
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {s.user?.identity_number || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-900 dark:text-slate-100">
                    {s.user?.name || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-500">
                    {s.user?.email || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{s.program?.name || "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{s.cohort?.name || "-"}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      title={t("changeStatusTitle")}
                      onClick={() => {
                        setStatusTarget(s);
                        setStatusValue(s.status || "active");
                        setStatusReason("");
                      }}
                      className="cursor-pointer"
                    >
                      <Badge className={STATUS_BADGE[s.status || ""] || "bg-slate-100 text-slate-600"}>
                        {statusLabel(s.status)}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)} aria-label={tc("edit")}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleting(s)}
                      aria-label={tc("delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta.total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {t("paginationInfo", { total: meta.total, page, lastPage: meta.last_page })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {tc("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.last_page}
              onClick={() => setPage(page + 1)}
            >
              {tc("next")}
            </Button>
          </div>
        </div>
      )}

      {/* Dialog tambah/edit */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? t("editStudent") : t("addStudent")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("fullName")}</label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("email")}</label>
                <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("nim")}</label>
                <Input required value={form.identity_number} onChange={(e) => setForm({ ...form, identity_number: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {editingId ? t("passwordEdit") : t("passwordCreate")}
              </label>
              <Input
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={t("passwordPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("programStudy")}</label>
                <select
                  className={selectClass}
                  required
                  value={form.program_id}
                  onChange={(e) => setForm({ ...form, program_id: e.target.value })}
                >
                  <option value="">{t("selectProgram")}</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("cohort")}</label>
                <select
                  className={selectClass}
                  required
                  value={form.cohort_id}
                  onChange={(e) => setForm({ ...form, cohort_id: e.target.value })}
                >
                  <option value="">{t("selectCohort")}</option>
                  {cohorts
                    .filter((c) => !form.program_id || c.program_id === form.program_id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!editingId ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("initialStatus")}</label>
                  <select
                    className={selectClass}
                    required
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    {statuses.map((s) => (
                      <option key={s.id} value={s.value}>{s.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{tc("status")}</label>
                  <p className="text-sm text-muted-foreground border rounded-md px-3 py-2.5">
                    {t("statusEditHint")}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("enrollmentDate")}</label>
                <Input
                  type="date"
                  required
                  value={form.enrollment_date}
                  onChange={(e) => setForm({ ...form, enrollment_date: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? tc("saving") : tc("save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog ubah status (transisi siklus akademik) */}
      <Dialog open={!!statusTarget} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("changeStatusDialogTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangeStatus} className="space-y-4 pt-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t.rich("statusCurrentInfo", {
                name: statusTarget?.user?.name ?? "",
                status: statusLabel(statusTarget?.status),
                b: (c) => <span className="font-semibold">{c}</span>,
                m: (c) => <span className="font-medium">{c}</span>,
              })}
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("newStatus")}</label>
              <select
                className={selectClass}
                required
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value)}
              >
                {statuses.map((st) => (
                  <option key={st.id} value={st.value}>{st.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("reasonLabel")}</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                minLength={5}
                maxLength={1000}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStatusTarget(null)}>
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={isChangingStatus} className="bg-blue-900 hover:bg-blue-800 text-white">
                {isChangingStatus ? tc("saving") : t("changeStatusButton")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog konfirmasi hapus */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t.rich("deleteConfirm", {
              name: deleting?.user?.name ?? "",
              b: (c) => <span className="font-semibold">{c}</span>,
            })}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>{tc("cancel")}</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
              {tc("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog import */}
      <Dialog open={isImportOpen} onOpenChange={resetImportDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("importTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleImport} className="space-y-4 pt-2">
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/40 p-3 text-sm text-blue-900 dark:text-blue-200">
              <p className="flex items-start gap-2">
                <GraduationCap className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  {t.rich("importInfo", {
                    b: (c) => <b>{c}</b>,
                    link: (c) => (
                      <button type="button" onClick={downloadTemplate} className="underline font-medium">
                        {c}
                      </button>
                    ),
                  })}
                </span>
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("programStudy")}</label>
                <select
                  className={selectClass}
                  required
                  value={importProgram}
                  onChange={(e) => setImportProgram(e.target.value)}
                >
                  <option value="">{t("selectProgram")}</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("cohort")}</label>
                <select
                  className={selectClass}
                  required
                  value={importCohort}
                  onChange={(e) => setImportCohort(e.target.value)}
                >
                  <option value="">{t("selectCohort")}</option>
                  {cohorts
                    .filter((c) => !importProgram || c.program_id === importProgram)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("fileLabel")}</label>
              <Input
                ref={fileInputRef}
                type="file"
                required
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>

            {importResult && (
              <div className="rounded-md border p-3 text-sm space-y-2">
                <p className="font-medium text-emerald-700 dark:text-emerald-400">
                  {t("importCreated", { count: importResult.created })}
                </p>
                {importResult.skipped.length > 0 && (
                  <div>
                    <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">
                      {t("importSkipped", { count: importResult.skipped.length })}
                    </p>
                    <ul className="list-disc pl-5 text-slate-600 dark:text-slate-300 max-h-40 overflow-y-auto">
                      {importResult.skipped.map((s, i) => (
                        <li key={i}>{t("importSkippedRow", { row: s.row, reason: s.reason })}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isImporting || !importFile}>
              {isImporting ? t("importing") : t("startImport")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
