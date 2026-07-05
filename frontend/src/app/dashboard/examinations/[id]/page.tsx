"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
    const t = setTimeout(async () => {
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
    return () => clearTimeout(t);
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
      toast.error("Gagal memuat daftar penguji.");
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
        toast.success("Soal diperbarui.");
      } else {
        await api.post(`/api/v1/examinations/${params.id}/questions`, payload);
        toast.success("Soal ditambahkan.");
      }
      setIsQuestionOpen(false);
      fetchQuestions();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan soal."));
    } finally {
      setSavingQuestion(false);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    try {
      await api.delete(`/api/v1/examinations/${params.id}/questions/${questionId}`);
      toast.success("Soal dihapus.");
      fetchQuestions();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus soal."));
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
      toast.success("Peserta ditambahkan.");
      fetchExamDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menambah peserta."));
    }
  };

  const removeParticipant = async (participantId: string) => {
    try {
      await api.delete(`/api/v1/examinations/${params.id}/participants/${participantId}`);
      toast.success("Peserta dikeluarkan.");
      fetchExamDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal mengeluarkan peserta."));
    }
  };

  const addAssessor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/api/v1/examinations/${params.id}/assessors`, {
        assessor_id: assessorId,
        exam_station_id: assessorStationId || null,
      });
      toast.success("Penguji ditugaskan.");
      setIsAssessorOpen(false);
      setAssessorId("");
      setAssessorStationId("");
      fetchExamDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menugaskan penguji."));
    }
  };

  const removeAssessor = async (assessorRowId: string) => {
    try {
      await api.delete(`/api/v1/examinations/${params.id}/assessors/${assessorRowId}`);
      toast.success("Penguji dihapus dari ujian.");
      fetchExamDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus penguji."));
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
      toast.success("Stasiun ditambahkan.");
      setIsStationOpen(false);
      fetchExamDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menambah stasiun."));
    }
  };

  const removeStation = async (stationId: string) => {
    try {
      await api.delete(`/api/v1/examinations/${params.id}/stations/${stationId}`);
      toast.success("Stasiun dihapus.");
      fetchExamDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus stasiun."));
    }
  };

  const handleDownloadPdf = () => {
    toast.loading("Membuat PDF Berita Acara...", { id: "pdf-download" });
    api.get(`/api/v1/examinations/${params.id}/pdf`, { responseType: "blob" })
      .then((response) => {
        const _url = window.URL.createObjectURL(new Blob([response.data]));
        const _link = document.createElement("a");
        _link.href = _url;
        _link.setAttribute("download", `Berita_Acara_Ujian_${(exam?.name ?? "Ujian").replace(/\s+/g, "_")}.pdf`);
        document.body.appendChild(_link);
        _link.click();
        _link.parentNode?.removeChild(_link);
        toast.success("PDF berhasil diunduh!", { id: "pdf-download" });
      })
      .catch((error) => {
        console.error("PDF download failed", error);
        toast.error("Gagal mengunduh PDF.", { id: "pdf-download" });
      });
  };

  if (loading) {
    return <div className="p-6"><Skeleton className="h-12 w-64 mb-4" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!exam) {
    return <div className="p-6 text-center text-red-500">Ujian tidak ditemukan.</div>;
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
            Stase: {exam.stase?.name} • Tanggal: {new Date(exam.date).toLocaleDateString("id-ID")}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {exam.status !== "COMPLETED" && exam.type === "OSCE" && (
            <Button onClick={() => router.push(`/dashboard/examinations/${exam.id}/assess`)} className="gap-2">
              <PlayCircle className="h-4 w-4" /> Mulai Penilaian
            </Button>
          )}

          {exam.status === "COMPLETED" && (
            <Button variant="outline" onClick={handleDownloadPdf} className="gap-2 text-primary border-primary hover:bg-primary/5">
              <Download className="h-4 w-4" /> Unduh Berita Acara
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="participants" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="participants">Peserta ({exam.participants?.length || 0})</TabsTrigger>
          {isCbtType ? (
            <TabsTrigger value="questions">Bank Soal ({questions.length})</TabsTrigger>
          ) : (
            <TabsTrigger value="stations">Stasiun OSCE ({exam.stations?.length || 0})</TabsTrigger>
          )}
          <TabsTrigger value="assessors">Penguji ({exam.assessors?.length || 0})</TabsTrigger>
        </TabsList>

        {isCbtType && (
          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Bank Soal ({exam.type})</CardTitle>
                    <CardDescription>
                      {questions.length} soal — total {totalPoints} poin.
                      {questionsLocked && " Terkunci: sudah ada peserta yang menjawab."}
                    </CardDescription>
                  </div>
                  {canManage && !questionsLocked && exam.status !== "COMPLETED" && (
                    <Button variant="outline" size="sm" onClick={() => openQuestionForm()}>
                      <PlusCircle className="h-4 w-4 mr-1" /> Tambah Soal
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {questions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                    <ListChecks className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                    Belum ada soal. Tambahkan soal sebelum ujian dibuka (ONGOING).
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
                            <Badge variant="secondary">{q.points} poin</Badge>
                            {canManage && !questionsLocked && (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openQuestionForm(q)} aria-label="Edit soal">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                  onClick={() => deleteQuestion(q.id)}
                                  aria-label="Hapus soal"
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
                  <CardTitle>Daftar Peserta Ujian</CardTitle>
                  <CardDescription>Mahasiswa yang akan mengikuti ujian ini.</CardDescription>
                </div>
                {canManage && exam.status !== "COMPLETED" && (
                  <Button variant="outline" size="sm" onClick={() => setIsParticipantOpen(true)}>
                    <PlusCircle className="h-4 w-4 mr-1" /> Tambah Peserta
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {exam.participants?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">Belum ada peserta terdaftar.</div>
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
                            aria-label="Keluarkan peserta"
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
                  <CardTitle>Stasiun Ujian (Khusus OSCE)</CardTitle>
                  <CardDescription>Manajemen rubrik atau stasiun ujian klinis objektif terstruktur.</CardDescription>
                </div>
                {canManage && exam.status !== "COMPLETED" && (
                  <Button variant="outline" size="sm" onClick={openStationDialog}>
                    <PlusCircle className="h-4 w-4 mr-1" /> Tambah Stasiun
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {exam.stations?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">Belum ada stasiun yang dibuat.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {exam.stations?.map((s) => (
                    <Card key={s.id} className="border bg-slate-50/50 dark:bg-slate-900/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex justify-between items-start gap-2">
                          <span>Stasiun {s.order}: {s.name}</span>
                          {canManage && exam.status !== "COMPLETED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 shrink-0"
                              onClick={() => removeStation(s.id)}
                              aria-label="Hapus stasiun"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{s.description || "Tidak ada deskripsi/rubrik."}</p>
                        {s.assessment_template && (
                          <Badge variant="secondary" className="mt-2">
                            Rubrik: {s.assessment_template.name}
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
                  <CardTitle>Daftar Penguji</CardTitle>
                  <CardDescription>Dodiknis atau Dosen yang bertugas memberikan penilaian.</CardDescription>
                </div>
                {canManage && exam.status !== "COMPLETED" && (
                  <Button variant="outline" size="sm" onClick={openAssessorDialog}>
                    <PlusCircle className="h-4 w-4 mr-1" /> Tugaskan Penguji
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {exam.assessors?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">Belum ada penguji ditugaskan.</div>
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
                          <p className="text-sm text-muted-foreground">Stasiun: {a.exam_station?.name || "Semua"}</p>
                        </div>
                      </div>
                      {canManage && exam.status !== "COMPLETED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => removeAssessor(a.id)}
                          aria-label="Hapus penguji"
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
            <DialogTitle>Tambah Peserta Ujian</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Cari nama / NIM mahasiswa..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {searchingStudents ? (
                <p className="text-sm text-muted-foreground text-center py-4">Mencari...</p>
              ) : studentOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak ada mahasiswa ditemukan.</p>
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
                        {alreadyIn ? "Sudah Terdaftar" : "Tambah"}
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
            <DialogTitle>Tugaskan Penguji</DialogTitle>
          </DialogHeader>
          <form onSubmit={addAssessor} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Penguji (Dodiknis / Dosen)</label>
              <select
                className={selectClass}
                required
                value={assessorId}
                onChange={(e) => setAssessorId(e.target.value)}
              >
                <option value="">Pilih Penguji</option>
                {assessorOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            {exam.type === "OSCE" && (exam.stations?.length || 0) > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Stasiun (opsional)</label>
                <select
                  className={selectClass}
                  value={assessorStationId}
                  onChange={(e) => setAssessorStationId(e.target.value)}
                >
                  <option value="">Semua Stasiun</option>
                  {exam.stations?.map((s) => (
                    <option key={s.id} value={s.id}>Stasiun {s.order}: {s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <Button type="submit" className="w-full">Tugaskan</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog tambah/edit soal CBT */}
      <Dialog open={isQuestionOpen} onOpenChange={setIsQuestionOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestionId ? "Edit Soal" : "Tambah Soal"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveQuestion} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Teks Soal</label>
              <Textarea
                required
                rows={3}
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="Tulis pertanyaan..."
              />
            </div>
            <div className="space-y-2 w-32">
              <label className="text-sm font-medium">Poin</label>
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
                <label className="text-sm font-medium">Pilihan Jawaban (tandai yang benar)</label>
                {qOptions.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQOptions([...qOptions, { option_text: "", is_correct: false }])}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Opsi
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
                    aria-label={`Tandai opsi ${idx + 1} benar`}
                  />
                  <Input
                    required
                    placeholder={`Opsi ${String.fromCharCode(65 + idx)}`}
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
                      aria-label="Hapus opsi"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Klik radio di kiri untuk menandai jawaban benar (tepat satu).
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={savingQuestion}>
              {savingQuestion ? "Menyimpan..." : "Simpan Soal"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog tambah stasiun */}
      <Dialog open={isStationOpen} onOpenChange={setIsStationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Stasiun OSCE</DialogTitle>
          </DialogHeader>
          <form onSubmit={addStation} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Stasiun</label>
              <Input
                required
                value={stationForm.name}
                onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                placeholder="Contoh: Anamnesis & Pemeriksaan Fisik"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Deskripsi (opsional)</label>
              <Textarea
                rows={2}
                value={stationForm.description}
                onChange={(e) => setStationForm({ ...stationForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Rubrik (opsional)</label>
              <select
                className={selectClass}
                value={stationForm.assessment_template_id}
                onChange={(e) => setStationForm({ ...stationForm, assessment_template_id: e.target.value })}
              >
                <option value="">Tanpa rubrik (nilai langsung)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full">Tambah Stasiun</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
