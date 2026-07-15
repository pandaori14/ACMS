"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { AssessmentTemplate, Exam, Student } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, ClipboardCheck, PlayCircle, Download, Search, Trash2, PlusCircle, Pencil, ListChecks, X } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

interface AssessorOption {
  id: string;
  name: string;
  email?: string;
}

interface QuestionOption {
  id?: string;
  option_text: string;
  is_correct: boolean;
}

interface ExamQuestionRow {
  id: string;
  question_text: string;
  points: number;
  order: number;
  options: { id: string; option_text: string; is_correct: boolean; order: number }[];
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

export default function ExaminationDetailPage() {
  const t = useTranslations("examDetail");
  const tc = useTranslations("common");
  const params = useParams();
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const canManage = authUser?.permissions?.includes("manage-examinations");

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog tambah peserta
  const [isParticipantOpen, setIsParticipantOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentOptions, setStudentOptions] = useState<Student[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);

  // Dialog tugaskan penguji
  const [isAssessorOpen, setIsAssessorOpen] = useState(false);
  const [assessorOptions, setAssessorOptions] = useState<AssessorOption[]>([]);
  const [assessorId, setAssessorId] = useState("");
  const [assessorStationId, setAssessorStationId] = useState("");

  // Dialog tambah stasiun
  const [isStationOpen, setIsStationOpen] = useState(false);
  const [stationForm, setStationForm] = useState({ name: "", description: "", assessment_template_id: "" });
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);

  // Bank soal CBT
  const [questions, setQuestions] = useState<ExamQuestionRow[]>([]);
  const [questionsLocked, setQuestionsLocked] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [isQuestionOpen, setIsQuestionOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qText, setQText] = useState("");
  const [qPoints, setQPoints] = useState(1);
  const [qOptions, setQOptions] = useState<QuestionOption[]>([
    { option_text: "", is_correct: true },
    { option_text: "", is_correct: false },
  ]);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const fetchExamDetail = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/examinations/${params.id}`);
      setExam(res.data.data);
    } catch (err) {
      console.error("Failed to fetch exam detail", err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchExamDetail();
  }, [fetchExamDetail]);

  // Cari mahasiswa (debounce) untuk dialog peserta
  useEffect(() => {
    if (!isParticipantOpen) return;
    const timer = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const res = await api.get("/api/v1/academic/students", {
          params: { per_page: 10, ...(studentSearch ? { search: studentSearch } : {}) },
        });
        setStudentOptions(res.data.data || []);
      } catch {
        setStudentOptions([]);
      } finally {
        setSearchingStudents(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [studentSearch, isParticipantOpen]);

  const openAssessorDialog = async () => {
    setIsAssessorOpen(true);
    try {
      const [dodiknis, dosen] = await Promise.all([
        api.get("/api/users", { params: { role: "Dodiknis", per_page: 100 } }),
        api.get("/api/users", { params: { role: "Dosen", per_page: 100 } }),
      ]);
      const merge = [...(dodiknis.data.data || []), ...(dosen.data.data || [])];
      const unique = new Map<string, AssessorOption>();
      merge.forEach((u: AssessorOption) => unique.set(u.id, u));
      setAssessorOptions(Array.from(unique.values()));
    } catch {
      toast.error(t("loadAssessorsError"));
    }
  };

  // ─────── Bank soal CBT ───────
  const isCbtType = exam?.type === "CBT" || exam?.type === "WRITTEN";

  const fetchQuestions = useCallback(async () => {
    if (!canManage) return;
    try {
      const res = await api.get(`/api/v1/examinations/${params.id}/questions`);
      setQuestions(res.data.data || []);
      setQuestionsLocked(!!res.data.meta?.has_answers);
      setTotalPoints(res.data.meta?.total_points || 0);
    } catch {
      // bukan CBT / tak berhak — abaikan
    }
  }, [params.id, canManage]);

  useEffect(() => {
    if (isCbtType) fetchQuestions();
  }, [isCbtType, fetchQuestions]);

  const openQuestionForm = (q?: ExamQuestionRow) => {
    if (q) {
      setEditingQuestionId(q.id);
      setQText(q.question_text);
      setQPoints(q.points);
      setQOptions(q.options.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct })));
    } else {
      setEditingQuestionId(null);
      setQText("");
      setQPoints(1);
      setQOptions([
        { option_text: "", is_correct: true },
        { option_text: "", is_correct: false },
      ]);
    }
    setIsQuestionOpen(true);
  };

  const saveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingQuestion(true);
    try {
      const payload = { question_text: qText, points: qPoints, options: qOptions };
      if (editingQuestionId) {
        await api.put(`/api/v1/examinations/${params.id}/questions/${editingQuestionId}`, payload);
        toast.success(t("questionUpdated"));
      } else {
        await api.post(`/api/v1/examinations/${params.id}/questions`, payload);
        toast.success(t("questionAdded"));
      }
      setIsQuestionOpen(false);
      fetchQuestions();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("questionSaveError")));
    } finally {
      setSavingQuestion(false);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    try {
      await api.delete(`/api/v1/examinations/${params.id}/questions/${questionId}`);
      toast.success(t("questionDeleted"));
      fetchQuestions();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("questionDeleteError")));
    }
  };

  // ---- Ambil dari Bank Soal (menyalin — ujian menyimpan snapshot sendiri) ----
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [bankItems, setBankItems] = useState<{ id: string; question_text: string; points: number; topic?: string | null }[]>([]);
  const [bankSearch, setBankSearch] = useState("");
  const [bankSelected, setBankSelected] = useState<string[]>([]);
  const [isCopying, setIsCopying] = useState(false);

  const openBankPicker = async () => {
    setBankSelected([]);
    setBankSearch("");
    setIsBankOpen(true);
    try {
      const res = await api.get("/api/v1/examinations/question-bank", {
        params: exam?.stase_id ? { stase_id: exam.stase_id, per_page: 50 } : { per_page: 50 },
      });
      setBankItems(res.data.data || []);
    } catch {
      toast.error(t("loadBankError"));
    }
  };

  const searchBank = async () => {
    try {
      const res = await api.get("/api/v1/examinations/question-bank", {
        params: { search: bankSearch, per_page: 50 },
      });
      setBankItems(res.data.data || []);
    } catch {
      toast.error(t("searchBankError"));
    }
  };

  const copyFromBank = async () => {
    if (bankSelected.length === 0) return;
    setIsCopying(true);
    try {
      const res = await api.post(`/api/v1/examinations/${params.id}/questions/from-bank`, {
        item_ids: bankSelected,
      });
      toast.success(res.data.message);
      setIsBankOpen(false);
      fetchQuestions();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("copyBankError")));
    } finally {
      setIsCopying(false);
    }
  };

  const openStationDialog = async () => {
    setStationForm({ name: "", description: "", assessment_template_id: "" });
    setIsStationOpen(true);
    try {
      const res = await api.get("/api/v1/assessments/templates");
      setTemplates(res.data.data || []);
    } catch {
      setTemplates([]);
    }
  };

  const addParticipant = async (userId: string) => {
    try {
      await api.post(`/api/v1/examinations/${params.id}/participants`, { student_id: userId });
      toast.success(t("participantAdded"));
      fetchExamDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("participantAddError")));
    }
  };

  const removeParticipant = async (participantId: string) => {
    try {
      await api.delete(`/api/v1/examinations/${params.id}/participants/${participantId}`);
      toast.success(t("participantRemoved"));
      fetchExamDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("participantRemoveError")));
    }
  };

  const addAssessor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/api/v1/examinations/${params.id}/assessors`, {
        assessor_id: assessorId,
        exam_station_id: assessorStationId || null,
      });
      toast.success(t("assessorAssigned"));
      setIsAssessorOpen(false);
      setAssessorId("");
      setAssessorStationId("");
      fetchExamDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("assessorAssignError")));
    }
  };

  const removeAssessor = async (assessorRowId: string) => {
    try {
      await api.delete(`/api/v1/examinations/${params.id}/assessors/${assessorRowId}`);
      toast.success(t("assessorRemoved"));
      fetchExamDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("assessorRemoveError")));
    }
  };

  const addStation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/api/v1/examinations/${params.id}/stations`, {
        name: stationForm.name,
        description: stationForm.description || null,
        assessment_template_id: stationForm.assessment_template_id || null,
      });
      toast.success(t("stationAdded"));
      setIsStationOpen(false);
      fetchExamDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("stationAddError")));
    }
  };

  const removeStation = async (stationId: string) => {
    try {
      await api.delete(`/api/v1/examinations/${params.id}/stations/${stationId}`);
      toast.success(t("stationDeleted"));
      fetchExamDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("stationDeleteError")));
    }
  };

  const handleDownloadPdf = () => {
    toast.loading(t("pdfLoading"), { id: "pdf-download" });
    api.get(`/api/v1/examinations/${params.id}/pdf`, { responseType: "blob" })
      .then((response) => {
        const _url = window.URL.createObjectURL(new Blob([response.data]));
        const _link = document.createElement("a");
        _link.href = _url;
        const _prefix = t("pdfFilePrefix").replace(/\s+/g, "_");
        _link.setAttribute("download", `${_prefix}_${(exam?.name ?? t("pdfFileFallback")).replace(/\s+/g, "_")}.pdf`);
        document.body.appendChild(_link);
        _link.click();
        _link.parentNode?.removeChild(_link);
        toast.success(t("pdfSuccess"), { id: "pdf-download" });
      })
      .catch((error) => {
        console.error("PDF download failed", error);
        toast.error(t("pdfError"), { id: "pdf-download" });
      });
  };

  if (loading) {
    return <div className="p-6"><Skeleton className="h-12 w-64 mb-4" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!exam) {
    return <div className="p-6 text-center text-red-500">{t("notFound")}</div>;
  }

  const participantIds = new Set((exam.participants || []).map((p) => p.student_id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{exam.name}</h1>
            <Badge variant={exam.type === "OSCE" ? "default" : "secondary"}>{exam.type}</Badge>
            <Badge variant="outline">{exam.status}</Badge>
          </div>
          <p className="text-muted-foreground">
            {t("subtitle", {
              stase: exam.stase?.name ?? "-",
              date: new Date(exam.date).toLocaleDateString("id-ID"),
            })}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {exam.status !== "COMPLETED" && exam.type === "OSCE" && (
            <Button onClick={() => router.push(`/dashboard/examinations/${exam.id}/assess`)} className="gap-2">
              <PlayCircle className="h-4 w-4" /> {t("startAssessment")}
            </Button>
          )}

          {exam.status === "COMPLETED" && (
            <Button variant="outline" onClick={handleDownloadPdf} className="gap-2 text-primary border-primary hover:bg-primary/5">
              <Download className="h-4 w-4" /> {t("downloadReport")}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="participants" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="participants">{t("tabParticipants", { count: exam.participants?.length || 0 })}</TabsTrigger>
          {isCbtType ? (
            <TabsTrigger value="questions">{t("tabQuestionBank", { count: questions.length })}</TabsTrigger>
          ) : (
            <TabsTrigger value="stations">{t("tabStations", { count: exam.stations?.length || 0 })}</TabsTrigger>
          )}
          <TabsTrigger value="assessors">{t("tabAssessors", { count: exam.assessors?.length || 0 })}</TabsTrigger>
        </TabsList>

        {isCbtType && (
          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{t("questionsCardTitle", { type: exam.type })}</CardTitle>
                    <CardDescription>
                      {t("questionsCardDesc", { count: questions.length, points: totalPoints })}
                      {questionsLocked && t("questionsLockedNote")}
                    </CardDescription>
                  </div>
                  {canManage && !questionsLocked && exam.status !== "COMPLETED" && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={openBankPicker}>
                        <ListChecks className="h-4 w-4 mr-1" /> {t("takeFromBank")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openQuestionForm()}>
                        <PlusCircle className="h-4 w-4 mr-1" /> {t("addQuestion")}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {questions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                    <ListChecks className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                    {t("questionsEmpty")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questions.map((q, qi) => (
                      <div key={q.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium text-sm whitespace-pre-wrap">
                            <span className="text-muted-foreground mr-2">{qi + 1}.</span>
                            {q.question_text}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="secondary">{t("points", { points: q.points })}</Badge>
                            {canManage && !questionsLocked && (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openQuestionForm(q)} aria-label={t("editQuestionAria")}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                  onClick={() => deleteQuestion(q.id)}
                                  aria-label={t("deleteQuestionAria")}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {q.options.map((o, oi) => (
                            <li
                              key={o.id}
                              className={`text-sm flex items-center gap-2 ${o.is_correct ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}
                            >
                              <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0">
                                {String.fromCharCode(65 + oi)}
                              </span>
                              {o.option_text}
                              {o.is_correct && <ClipboardCheck className="w-3.5 h-3.5" />}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="participants">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t("participantsCardTitle")}</CardTitle>
                  <CardDescription>{t("participantsCardDesc")}</CardDescription>
                </div>
                {canManage && exam.status !== "COMPLETED" && (
                  <Button variant="outline" size="sm" onClick={() => setIsParticipantOpen(true)}>
                    <PlusCircle className="h-4 w-4 mr-1" /> {t("addParticipant")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {exam.participants?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">{t("participantsEmpty")}</div>
              ) : (
                <div className="space-y-4">
                  {exam.participants?.map((p) => (
                    <div key={p.id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{p.student?.name}</p>
                          <p className="text-sm text-muted-foreground">{p.student?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Badge variant={p.status === "REGISTERED" ? "secondary" : "default"}>{p.status}</Badge>
                          {p.final_score !== null && p.final_score !== undefined && (
                            <div className="mt-1 font-bold text-lg text-primary">{p.final_score}</div>
                          )}
                        </div>
                        {canManage && exam.status !== "COMPLETED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => removeParticipant(p.id)}
                            aria-label={t("removeParticipantAria")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stations">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t("stationsCardTitle")}</CardTitle>
                  <CardDescription>{t("stationsCardDesc")}</CardDescription>
                </div>
                {canManage && exam.status !== "COMPLETED" && (
                  <Button variant="outline" size="sm" onClick={openStationDialog}>
                    <PlusCircle className="h-4 w-4 mr-1" /> {t("addStation")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {exam.stations?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">{t("stationsEmpty")}</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {exam.stations?.map((s) => (
                    <Card key={s.id} className="border bg-slate-50/50 dark:bg-slate-900/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex justify-between items-start gap-2">
                          <span>{t("stationName", { order: s.order ?? "", name: s.name ?? "" })}</span>
                          {canManage && exam.status !== "COMPLETED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 shrink-0"
                              onClick={() => removeStation(s.id)}
                              aria-label={t("deleteStationAria")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{s.description || t("noDescription")}</p>
                        {s.assessment_template && (
                          <Badge variant="secondary" className="mt-2">
                            {t("rubricLabel", { name: s.assessment_template.name ?? "" })}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessors">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t("assessorsCardTitle")}</CardTitle>
                  <CardDescription>{t("assessorsCardDesc")}</CardDescription>
                </div>
                {canManage && exam.status !== "COMPLETED" && (
                  <Button variant="outline" size="sm" onClick={openAssessorDialog}>
                    <PlusCircle className="h-4 w-4 mr-1" /> {t("assignAssessor")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {exam.assessors?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">{t("assessorsEmpty")}</div>
              ) : (
                <div className="space-y-4">
                  {exam.assessors?.map((a) => (
                    <div key={a.id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="bg-green-100 p-2 rounded-full dark:bg-green-900/30">
                          <ClipboardCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium">{a.assessor?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {t("assessorStationLabel", { name: a.exam_station?.name || t("allStationsShort") })}
                          </p>
                        </div>
                      </div>
                      {canManage && exam.status !== "COMPLETED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => removeAssessor(a.id)}
                          aria-label={t("deleteAssessorAria")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog tambah peserta */}
      <Dialog open={isParticipantOpen} onOpenChange={setIsParticipantOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("addParticipantTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder={t("searchStudentPlaceholder")}
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {searchingStudents ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("searching")}</p>
              ) : studentOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("noStudentsFound")}</p>
              ) : (
                studentOptions.map((s) => {
                  const alreadyIn = s.user_id ? participantIds.has(s.user_id) : false;
                  return (
                    <div key={s.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <p className="font-medium text-sm">{s.user?.name}</p>
                        <p className="text-xs text-muted-foreground">{s.user?.identity_number} — {s.cohort?.name}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyIn ? "secondary" : "outline"}
                        disabled={alreadyIn || !s.user_id}
                        onClick={() => s.user_id && addParticipant(s.user_id)}
                      >
                        {alreadyIn ? t("alreadyRegistered") : tc("add")}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog tugaskan penguji */}
      <Dialog open={isAssessorOpen} onOpenChange={setIsAssessorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("assignAssessorTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={addAssessor} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("assessorLabel")}</label>
              <select
                className={selectClass}
                required
                value={assessorId}
                onChange={(e) => setAssessorId(e.target.value)}
              >
                <option value="">{t("selectAssessor")}</option>
                {assessorOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            {exam.type === "OSCE" && (exam.stations?.length || 0) > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("stationOptionalLabel")}</label>
                <select
                  className={selectClass}
                  value={assessorStationId}
                  onChange={(e) => setAssessorStationId(e.target.value)}
                >
                  <option value="">{t("allStations")}</option>
                  {exam.stations?.map((s) => (
                    <option key={s.id} value={s.id}>{t("stationName", { order: s.order ?? "", name: s.name ?? "" })}</option>
                  ))}
                </select>
              </div>
            )}
            <Button type="submit" className="w-full">{t("assign")}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog ambil soal dari bank (menyalin snapshot ke ujian) */}
      <Dialog open={isBankOpen} onOpenChange={setIsBankOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("takeFromBankTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              {t("takeFromBankDesc")}
            </p>
            <div className="flex gap-2">
              <Input
                placeholder={t("searchBankPlaceholder")}
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchBank(); } }}
              />
              <Button type="button" variant="outline" onClick={searchBank}>{tc("search")}</Button>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-md border divide-y divide-slate-100 dark:divide-slate-800">
              {bankItems.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">{t("bankEmpty")}</p>
              ) : (
                bankItems.map((item) => (
                  <label key={item.id} className="flex items-start gap-2 p-2.5 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-gray-300"
                      checked={bankSelected.includes(item.id)}
                      onChange={() =>
                        setBankSelected((prev) =>
                          prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id]
                        )
                      }
                    />
                    <span className="min-w-0">
                      <span className="line-clamp-2">{item.question_text}</span>
                      <span className="text-xs text-slate-400">
                        {t("points", { points: item.points })}{item.topic ? ` · ${item.topic}` : ""}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsBankOpen(false)}>{tc("cancel")}</Button>
              <Button
                disabled={bankSelected.length === 0 || isCopying}
                onClick={copyFromBank}
                className="bg-blue-900 hover:bg-blue-800 text-white"
              >
                {isCopying ? t("copying") : t("copyNQuestions", { count: bankSelected.length })}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog tambah/edit soal CBT */}
      <Dialog open={isQuestionOpen} onOpenChange={setIsQuestionOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestionId ? t("editQuestionTitle") : t("addQuestionTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveQuestion} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("questionTextLabel")}</label>
              <Textarea
                required
                rows={3}
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder={t("questionTextPlaceholder")}
              />
            </div>
            <div className="space-y-2 w-32">
              <label className="text-sm font-medium">{t("pointsLabel")}</label>
              <Input
                type="number"
                min={1}
                max={100}
                required
                value={qPoints}
                onChange={(e) => setQPoints(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t("optionsLabel")}</label>
                {qOptions.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQOptions([...qOptions, { option_text: "", is_correct: false }])}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> {t("optionBtn")}
                  </Button>
                )}
              </div>
              {qOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct-option"
                    className="shrink-0 accent-emerald-600 w-4 h-4"
                    checked={opt.is_correct}
                    onChange={() =>
                      setQOptions(qOptions.map((o, i) => ({ ...o, is_correct: i === idx })))
                    }
                    aria-label={t("markOptionCorrectAria", { n: idx + 1 })}
                  />
                  <Input
                    required
                    placeholder={t("optionPlaceholder", { letter: String.fromCharCode(65 + idx) })}
                    value={opt.option_text}
                    onChange={(e) => {
                      const next = [...qOptions];
                      next[idx] = { ...next[idx], option_text: e.target.value };
                      setQOptions(next);
                    }}
                  />
                  {qOptions.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 shrink-0"
                      onClick={() => {
                        const next = qOptions.filter((_, i) => i !== idx);
                        if (!next.some((o) => o.is_correct)) next[0].is_correct = true;
                        setQOptions(next);
                      }}
                      aria-label={t("deleteOptionAria")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                {t("optionsHint")}
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={savingQuestion}>
              {savingQuestion ? tc("saving") : t("saveQuestion")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog tambah stasiun */}
      <Dialog open={isStationOpen} onOpenChange={setIsStationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addStationTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={addStation} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("stationNameLabel")}</label>
              <Input
                required
                value={stationForm.name}
                onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                placeholder={t("stationNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("descriptionLabel")}</label>
              <Textarea
                rows={2}
                value={stationForm.description}
                onChange={(e) => setStationForm({ ...stationForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("rubricTemplateLabel")}</label>
              <select
                className={selectClass}
                value={stationForm.assessment_template_id}
                onChange={(e) => setStationForm({ ...stationForm, assessment_template_id: e.target.value })}
              >
                <option value="">{t("noRubric")}</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full">{t("addStation")}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
