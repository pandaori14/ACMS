"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Faculty, Program } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, BookOpen, Pencil, Trash2 } from "lucide-react";
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

const EMPTY_PROGRAM = { faculty_id: "", code: "", name: "", accreditation: "Unggul" };

export default function FacultyManagement() {
  const t = useTranslations("academicFaculty");
  const tc = useTranslations("common");
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fakultas: tambah/edit/hapus
  const [isFacultyOpen, setIsFacultyOpen] = useState(false);
  const [facultyName, setFacultyName] = useState("");
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [deletingFaculty, setDeletingFaculty] = useState<Faculty | null>(null);

  // Program: tambah/edit/hapus
  const [isProgramOpen, setIsProgramOpen] = useState(false);
  const [programData, setProgramData] = useState(EMPTY_PROGRAM);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [deletingProgram, setDeletingProgram] = useState<Program | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [facRes, progRes] = await Promise.all([
        api.get("/api/v1/academic/faculties"),
        api.get("/api/v1/academic/programs"),
      ]);
      setFaculties(facRes.data.data || facRes.data);
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

  // ---------- Fakultas ----------

  const openFacultyForm = (f?: Faculty) => {
    setEditingFaculty(f || null);
    setFacultyName(f?.name || "");
    setIsFacultyOpen(true);
  };

  const handleSaveFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFaculty) {
        await api.put(`/api/v1/academic/faculties/${editingFaculty.id}`, { name: facultyName });
        toast.success(t("facultyUpdated"));
      } else {
        await api.post("/api/v1/academic/faculties", { name: facultyName });
        toast.success(t("facultyCreated"));
      }
      setIsFacultyOpen(false);
      setFacultyName("");
      setEditingFaculty(null);
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("facultySaveError")));
    }
  };

  const handleDeleteFaculty = async () => {
    if (!deletingFaculty) return;
    try {
      await api.delete(`/api/v1/academic/faculties/${deletingFaculty.id}`);
      toast.success(t("facultyDeleted"));
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("facultyDeleteError")));
    } finally {
      setDeletingFaculty(null);
    }
  };

  // ---------- Program ----------

  const openProgramForm = (p?: Program) => {
    setEditingProgram(p || null);
    setProgramData(
      p
        ? {
            faculty_id: p.faculty_id || p.faculty?.id || "",
            code: p.code || "",
            name: p.name || "",
            accreditation: p.accreditation || "Unggul",
          }
        : EMPTY_PROGRAM
    );
    setIsProgramOpen(true);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProgram) {
        await api.put(`/api/v1/academic/programs/${editingProgram.id}`, programData);
        toast.success(t("programUpdated"));
      } else {
        await api.post("/api/v1/academic/programs", programData);
        toast.success(t("programCreated"));
      }
      setIsProgramOpen(false);
      setProgramData(EMPTY_PROGRAM);
      setEditingProgram(null);
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("programSaveError")));
    }
  };

  const handleDeleteProgram = async () => {
    if (!deletingProgram) return;
    try {
      await api.delete(`/api/v1/academic/programs/${deletingProgram.id}`);
      toast.success(t("programDeleted"));
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("programDeleteError")));
    } finally {
      setDeletingProgram(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {t("title")}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fakultas */}
        <Card className="clean-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-500" />
              <CardTitle className="text-lg">{t("faculty")}</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => openFacultyForm()}>
              {tc("add")}
            </Button>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("facultyName")}</TableHead>
                  <TableHead className="text-right">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-slate-500">{tc("loading")}</TableCell>
                  </TableRow>
                ) : faculties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-slate-500 py-8">
                      {t("noFaculty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  faculties.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">{f.name}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => openFacultyForm(f)} aria-label={tc("edit")}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeletingFaculty(f)}
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
          </CardContent>
        </Card>

        {/* Program Studi */}
        <Card className="clean-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-slate-500" />
              <CardTitle className="text-lg">{t("programStudy")}</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => openProgramForm()}>
              {tc("add")}
            </Button>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("code")}</TableHead>
                  <TableHead>{t("programName")}</TableHead>
                  <TableHead>{t("accreditation")}</TableHead>
                  <TableHead className="text-right">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-500">{tc("loading")}</TableCell>
                  </TableRow>
                ) : programs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                      {t("noProgram")}
                    </TableCell>
                  </TableRow>
                ) : (
                  programs.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.code}</TableCell>
                      <TableCell className="text-slate-900 dark:text-slate-100">{p.name}</TableCell>
                      <TableCell>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-xs font-semibold">
                          {p.accreditation || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => openProgramForm(p)} aria-label={tc("edit")}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeletingProgram(p)}
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
          </CardContent>
        </Card>
      </div>

      {/* Dialog fakultas */}
      <Dialog open={isFacultyOpen} onOpenChange={setIsFacultyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFaculty ? t("editFaculty") : t("addFaculty")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveFaculty} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("facultyName")}</label>
              <Input
                required
                value={facultyName}
                onChange={(e) => setFacultyName(e.target.value)}
                placeholder={t("facultyNamePlaceholder")}
              />
            </div>
            <Button type="submit" className="w-full">{tc("save")}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog program */}
      <Dialog open={isProgramOpen} onOpenChange={setIsProgramOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProgram ? t("editProgram") : t("addProgram")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProgram} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("faculty")}</label>
              <select
                className={selectClass}
                value={programData.faculty_id}
                onChange={(e) => setProgramData({ ...programData, faculty_id: e.target.value })}
                required
              >
                <option value="">{t("selectFaculty")}</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("code")}</label>
              <Input
                required
                value={programData.code}
                onChange={(e) => setProgramData({ ...programData, code: e.target.value })}
                placeholder={t("codePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("programName")}</label>
              <Input
                required
                value={programData.name}
                onChange={(e) => setProgramData({ ...programData, name: e.target.value })}
                placeholder={t("programNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("accreditation")}</label>
              <select
                className={selectClass}
                value={programData.accreditation}
                onChange={(e) => setProgramData({ ...programData, accreditation: e.target.value })}
                required
              >
                <option value="Unggul">{t("accUnggul")}</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="Baik Sekali">{t("accBaikSekali")}</option>
                <option value="Baik">{t("accBaik")}</option>
              </select>
            </div>
            <Button type="submit" className="w-full">{tc("save")}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus fakultas */}
      <Dialog open={!!deletingFaculty} onOpenChange={(open) => !open && setDeletingFaculty(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteFacultyTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t.rich("deleteFacultyConfirm", {
              name: deletingFaculty?.name ?? "",
              b: (c) => <span className="font-semibold">{c}</span>,
            })}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeletingFaculty(null)}>{tc("cancel")}</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteFaculty}>
              {tc("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus program */}
      <Dialog open={!!deletingProgram} onOpenChange={(open) => !open && setDeletingProgram(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteProgramTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t.rich("deleteProgramConfirm", {
              name: deletingProgram?.name ?? "",
              b: (c) => <span className="font-semibold">{c}</span>,
            })}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeletingProgram(null)}>{tc("cancel")}</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteProgram}>
              {tc("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
