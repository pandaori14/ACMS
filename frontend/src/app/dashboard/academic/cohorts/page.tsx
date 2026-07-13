"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Cohort, Program } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
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

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

interface CohortForm {
  program_id: string;
  name: string;
  year: number;
}

const EMPTY_FORM: CohortForm = {
  program_id: "",
  name: "",
  year: new Date().getFullYear(),
};

export default function CohortManagement() {
  const t = useTranslations("academicCohorts");
  const tc = useTranslations("common");
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CohortForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState<Cohort | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [cohortRes, progRes] = await Promise.all([
        api.get("/api/v1/academic/cohorts"),
        api.get("/api/v1/academic/programs"),
      ]);
      setCohorts(cohortRes.data.data || []);
      setPrograms(progRes.data.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("loadError")));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sekali saat mount
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (c: Cohort) => {
    setEditingId(c.id);
    setForm({
      program_id: c.program_id || c.program?.id || "",
      name: c.name || "",
      year: c.year || new Date().getFullYear(),
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/v1/academic/cohorts/${editingId}`, form);
        toast.success(t("updated"));
      } else {
        await api.post("/api/v1/academic/cohorts", form);
        toast.success(t("created"));
      }
      setIsFormOpen(false);
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("saveError")));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/api/v1/academic/cohorts/${deleting.id}`);
      toast.success(t("deleted"));
      setDeleting(null);
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("deleteError")));
      setDeleting(null);
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
        <Button onClick={openCreate} className="bg-blue-900 hover:bg-blue-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> {t("addCohort")}
        </Button>
      </div>

      <div className="rounded-md border bg-white dark:bg-gray-900 overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>{t("cohortName")}</TableHead>
              <TableHead>{t("year")}</TableHead>
              <TableHead>{t("programStudy")}</TableHead>
              <TableHead>{t("studentCount")}</TableHead>
              <TableHead className="text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-10">
                  {t("loadingData")}
                </TableCell>
              </TableRow>
            ) : cohorts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <CalendarDays className="w-10 h-10 text-slate-300" />
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">
                        {t("emptyTitle")}
                      </p>
                      <p className="text-sm text-slate-500">
                        {t("emptyDesc")}
                      </p>
                    </div>
                    <Button size="sm" onClick={openCreate}>
                      <Plus className="w-4 h-4 mr-2" /> {t("addCohort")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              cohorts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium whitespace-nowrap text-slate-900 dark:text-slate-100">
                    {c.name}
                  </TableCell>
                  <TableCell>{c.year}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.program?.name || "-"}</TableCell>
                  <TableCell>{c.students_count ?? 0}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)} aria-label={tc("edit")}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleting(c)}
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

      {/* Dialog tambah/edit */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t("editCohort") : t("addCohort")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
              <label className="text-sm font-medium">{t("cohortName")}</label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("cohortNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("year")}</label>
              <Input
                type="number"
                required
                min={2000}
                max={2100}
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? tc("saving") : tc("save")}
            </Button>
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
              name: deleting?.name ?? "",
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
    </div>
  );
}
