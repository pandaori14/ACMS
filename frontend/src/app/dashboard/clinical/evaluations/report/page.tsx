"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BarChart2, MessageSquare, Plus, Star, Trash2, Building2, Stethoscope } from "lucide-react";

interface QuestionBreakdown {
  question: string | null;
  average: number;
  count: number;
}

interface ReportTarget {
  target_type: "PRECEPTOR" | "HOSPITAL";
  target_name: string;
  respondents: number;
  average_rating: number;
  per_question: QuestionBreakdown[];
  comments: string[];
}

interface QuestionRow {
  id: string;
  target_type: string;
  question_text: string;
  is_active: boolean;
  submissions_count?: number;
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

function ratingColor(avg: number): string {
  if (avg >= 4) return "text-emerald-600";
  if (avg >= 3) return "text-amber-600";
  return "text-red-600";
}

export default function EvaluationReportPage() {
  const user = useAuthStore((state) => state.user);
  const canManageQuestions = user?.permissions?.includes("manage-academic-master");

  const [targets, setTargets] = useState<ReportTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [minResponses, setMinResponses] = useState(3);

  // Bank pertanyaan
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [qForm, setQForm] = useState({ target_type: "PRECEPTOR", question_text: "" });

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/v1/clinical/evaluations/report", {
        params: {
          min_responses: minResponses,
          ...(filterType ? { target_type: filterType } : {}),
        },
      });
      setTargets(res.data.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memuat laporan evaluasi."));
    } finally {
      setIsLoading(false);
    }
  }, [filterType, minResponses]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const fetchQuestions = useCallback(async () => {
    if (!canManageQuestions) return;
    try {
      const res = await api.get("/api/v1/clinical/evaluations/questions/all");
      setQuestions(res.data.data || []);
    } catch {
      // tab bank pertanyaan opsional
    }
  }, [canManageQuestions]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/clinical/evaluations/questions", qForm);
      toast.success("Pertanyaan ditambahkan.");
      setQForm({ target_type: "PRECEPTOR", question_text: "" });
      fetchQuestions();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menambah pertanyaan."));
    }
  };

  const toggleQuestion = async (q: QuestionRow) => {
    try {
      await api.put(`/api/v1/clinical/evaluations/questions/${q.id}`, { is_active: !q.is_active });
      fetchQuestions();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal mengubah status pertanyaan."));
    }
  };

  const deleteQuestion = async (q: QuestionRow) => {
    try {
      const res = await api.delete(`/api/v1/clinical/evaluations/questions/${q.id}`);
      toast.success(res.data.message);
      fetchQuestions();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus pertanyaan."));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Laporan Evaluasi Klinis</h1>
        <p className="text-muted-foreground mt-1">
          Rekap anonim penilaian mahasiswa terhadap preceptor dan rumah sakit.
        </p>
      </div>

      <Tabs defaultValue="report" className="w-full">
        <TabsList>
          <TabsTrigger value="report">Laporan Agregat</TabsTrigger>
          {canManageQuestions && <TabsTrigger value="questions">Bank Pertanyaan</TabsTrigger>}
        </TabsList>

        <TabsContent value="report" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <select className={`${selectClass} w-auto`} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Semua Target</option>
              <option value="PRECEPTOR">Preceptor (Dodiknis)</option>
              <option value="HOSPITAL">Rumah Sakit</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Ambang anonimitas:
              <Input
                type="number"
                className="w-20"
                min={1}
                max={10}
                value={minResponses}
                onChange={(e) => setMinResponses(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              />
              responden
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : targets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              <BarChart2 className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p>Belum ada data evaluasi yang memenuhi ambang anonimitas ({minResponses} responden).</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {targets.map((t, i) => (
                <Card key={i} className="clean-card">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {t.target_type === "HOSPITAL" ? (
                          <Building2 className="h-5 w-5 text-slate-500 shrink-0" />
                        ) : (
                          <Stethoscope className="h-5 w-5 text-slate-500 shrink-0" />
                        )}
                        <CardTitle className="text-base truncate">{t.target_name}</CardTitle>
                      </div>
                      <Badge variant="secondary">{t.respondents} responden</Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Star className={`h-5 w-5 ${ratingColor(t.average_rating)} fill-current`} />
                      <span className={`text-xl font-bold ${ratingColor(t.average_rating)}`}>
                        {t.average_rating.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">/ 5.00</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {t.per_question.map((q, qi) => (
                      <div key={qi} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground truncate pr-2">{q.question}</span>
                          <span className="font-medium shrink-0">{q.average.toFixed(2)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-900 rounded-full"
                            style={{ width: `${(q.average / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}

                    {t.comments.length > 0 && (
                      <details className="pt-2">
                        <summary className="text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" /> {t.comments.length} komentar anonim
                        </summary>
                        <ul className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                          {t.comments.map((c, ci) => (
                            <li key={ci} className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 rounded p-2">
                              &ldquo;{c}&rdquo;
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {canManageQuestions && (
          <TabsContent value="questions" className="space-y-4 mt-4">
            <form onSubmit={addQuestion} className="flex flex-col sm:flex-row gap-3">
              <select
                className={`${selectClass} sm:w-56`}
                value={qForm.target_type}
                onChange={(e) => setQForm({ ...qForm, target_type: e.target.value })}
              >
                <option value="PRECEPTOR">Untuk Preceptor</option>
                <option value="HOSPITAL">Untuk Rumah Sakit</option>
              </select>
              <Input
                required
                placeholder="Tulis pertanyaan evaluasi baru..."
                value={qForm.question_text}
                onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })}
              />
              <Button type="submit">
                <Plus className="h-4 w-4 mr-1" /> Tambah
              </Button>
            </form>

            <div className="space-y-2">
              {questions.length === 0 ? (
                <p className="text-sm text-muted-foreground border border-dashed rounded-md p-6 text-center">
                  Belum ada pertanyaan evaluasi.
                </p>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="flex items-center justify-between border rounded-md p-3 gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm ${q.is_active ? "" : "line-through text-muted-foreground"}`}>
                        {q.question_text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {q.target_type === "HOSPITAL" ? "Rumah Sakit" : "Preceptor"} — {q.submissions_count ?? 0} jawaban
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => toggleQuestion(q)}>
                        {q.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => deleteQuestion(q)}
                        aria-label="Hapus pertanyaan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
