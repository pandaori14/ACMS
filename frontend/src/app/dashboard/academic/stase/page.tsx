"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Stase, Program } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ClipboardCheck, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
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

interface StaseForm {
  program_id: string;
  code: string;
  name: string;
  duration_weeks: number;
  passing_grade: number;
  prerequisite_stase_ids: string[];
}

const EMPTY_FORM: StaseForm = {
  program_id: "",
  code: "",
  name: "",
  duration_weeks: 4,
  passing_grade: 60,
  prerequisite_stase_ids: [],
};

interface SkillItem {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
}

export default function StaseManagement() {
  const t = useTranslations("academicStase");
  const tc = useTranslations("common");
  const [stases, setStases] = useState<Stase[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StaseForm>(EMPTY_FORM);
  const [deleting, setDeleting] = useState<Stase | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [staseRes, progRes] = await Promise.all([
        api.get("/api/v1/academic/stase"),
        api.get("/api/v1/academic/programs")
      ]);
      setStases(staseRes.data.data || staseRes.data);
      setPrograms(progRes.data.data || progRes.data);
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
    setFormData(EMPTY_FORM);
    setIsOpen(true);
  };

  const openEdit = (stase: Stase) => {
    setEditingId(stase.id);
    setFormData({
      program_id: stase.program_id || stase.program?.id || "",
      code: stase.code || "",
      name: stase.name || "",
      duration_weeks: stase.duration_weeks || 4,
      passing_grade: Number(stase.passing_grade) || 60,
      prerequisite_stase_ids: stase.prerequisite_stase_ids || [],
    });
    setIsOpen(true);
  };

  const togglePrerequisite = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      prerequisite_stase_ids: prev.prerequisite_stase_ids.includes(id)
        ? prev.prerequisite_stase_ids.filter((x) => x !== id)
        : [...prev.prerequisite_stase_ids, id],
    }));
  };

  const staseNames = (ids?: string[] | null) =>
    (ids || [])
      .map((id) => stases.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");

  // ---- Skill checklist per stase ----
  const [skillStase, setSkillStase] = useState<Stase | null>(null);
  const [skillItems, setSkillItems] = useState<SkillItem[]>([]);
  const [newSkillName, setNewSkillName] = useState("");
  const [isSkillLoading, setIsSkillLoading] = useState(false);

  const openSkills = async (stase: Stase) => {
    setSkillStase(stase);
    setNewSkillName("");
    setIsSkillLoading(true);
    try {
      const res = await api.get("/api/v1/clinical/skills/items", {
        params: { stase_id: stase.id },
      });
      setSkillItems(res.data.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("skillLoadError")));
    } finally {
      setIsSkillLoading(false);
    }
  };

  const addSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillStase || !newSkillName.trim()) return;
    try {
      const res = await api.post("/api/v1/clinical/skills/items", {
        stase_id: skillStase.id,
        name: newSkillName.trim(),
      });
      setSkillItems((prev) => [...prev, res.data.data]);
      setNewSkillName("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("skillAddError")));
    }
  };

  const removeSkill = async (item: SkillItem) => {
    try {
      const res = await api.delete(`/api/v1/clinical/skills/items/${item.id}`);
      toast.success(res.data.message);
      setSkillItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("skillDeleteError")));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/api/v1/academic/stase/${editingId}`, formData);
        toast.success(t("updated"));
      } else {
        await api.post("/api/v1/academic/stase", formData);
        toast.success(t("created"));
      }
      setIsOpen(false);
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("saveError")));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/api/v1/academic/stase/${deleting.id}`);
      toast.success(t("deleted"));
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("deleteError")));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>
        <Button onClick={openCreate} className="bg-blue-900 hover:bg-blue-800 text-white">
          <Plus className="w-4 h-4 mr-2" /> {t("addStase")}
        </Button>
      </div>

      <div className="rounded-md border bg-white dark:bg-gray-900 overflow-x-auto">
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow>
              <TableHead>{t("code")}</TableHead>
              <TableHead>{t("staseName")}</TableHead>
              <TableHead>{t("program")}</TableHead>
              <TableHead>{t("duration")}</TableHead>
              <TableHead>{t("passingGrade")}</TableHead>
              <TableHead>{t("prerequisite")}</TableHead>
              <TableHead className="text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-10">{t("loadingData")}</TableCell>
              </TableRow>
            ) : stases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <GraduationCap className="w-10 h-10 text-slate-300" />
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{t("emptyTitle")}</p>
                      <p className="text-sm text-slate-500">
                        {t("emptyDesc")}
                      </p>
                    </div>
                    <Button size="sm" onClick={openCreate}>
                      <Plus className="w-4 h-4 mr-2" /> {t("addStase")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              stases.map((stase) => (
                <TableRow key={stase.id}>
                  <TableCell className="font-medium whitespace-nowrap">{stase.code}</TableCell>
                  <TableCell className="whitespace-nowrap">{stase.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{stase.program?.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{t("weeks", { count: stase.duration_weeks ?? 0 })}</TableCell>
                  <TableCell className="whitespace-nowrap">{stase.passing_grade}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm text-slate-600 dark:text-slate-300" title={staseNames(stase.prerequisite_stase_ids)}>
                    {staseNames(stase.prerequisite_stase_ids) || <span className="text-slate-400">—</span>}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => openSkills(stase)} aria-label={t("skillChecklist")} title={t("manageSkillChecklist")}>
                      <ClipboardCheck className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(stase)} aria-label={tc("edit")}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleting(stase)}
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
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t("editStase") : t("addStaseNew")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("programStudy")}</label>
              <select
                className={selectClass}
                value={formData.program_id}
                onChange={(e) => setFormData({...formData, program_id: e.target.value})}
                required
              >
                <option value="">{t("selectProgram")}</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("code")}</label>
              <Input required value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("staseName")}</label>
              <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("durationWeeks")}</label>
                <Input type="number" required min={1} value={formData.duration_weeks} onChange={(e) => setFormData({...formData, duration_weeks: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("passingGrade")}</label>
                <Input type="number" step="0.01" required min={0} max={100} value={formData.passing_grade} onChange={(e) => setFormData({...formData, passing_grade: Number(e.target.value)})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("prerequisiteStase")}</label>
              <p className="text-xs text-muted-foreground">
                {t("prerequisiteHint")}
              </p>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                {stases.filter((s) => s.id !== editingId).length === 0 ? (
                  <p className="text-sm text-slate-400 px-1">{t("noOtherStase")}</p>
                ) : (
                  stases
                    .filter((s) => s.id !== editingId)
                    .map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm px-1 py-0.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={formData.prerequisite_stase_ids.includes(s.id)}
                          onChange={() => togglePrerequisite(s.id)}
                        />
                        {s.name} <span className="text-slate-400">({s.code})</span>
                      </label>
                    ))
                )}
              </div>
            </div>
            <Button type="submit" className="w-full">{tc("save")}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Kelola skill checklist per stase */}
      <Dialog open={!!skillStase} onOpenChange={(open) => !open && setSkillStase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("skillDialogTitle", { name: skillStase?.name ?? "" })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("skillDialogDesc")}
          </p>
          {isSkillLoading ? (
            <p className="text-sm text-slate-500 py-4 text-center">{tc("loading")}</p>
          ) : (
            <ul className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-md border">
              {skillItems.length === 0 ? (
                <li className="px-3 py-4 text-sm text-slate-400 text-center">{t("noSkillItems")}</li>
              ) : (
                skillItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className={item.is_active ? "" : "line-through text-slate-400"}>{item.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => removeSkill(item)}
                      aria-label={t("deleteItem")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))
              )}
            </ul>
          )}
          <form onSubmit={addSkill} className="flex gap-2">
            <Input
              placeholder={t("skillNamePlaceholder")}
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              maxLength={255}
            />
            <Button type="submit" disabled={!newSkillName.trim()}>
              <Plus className="w-4 h-4 mr-1" /> {tc("add")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
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
