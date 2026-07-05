"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock, CheckCircle2, XCircle, Send, Loader2 } from "lucide-react";

interface TakeOption {
  id: string;
  option_text: string;
  order: number;
}

interface TakeQuestion {
  id: string;
  question_text: string;
  points: number;
  order: number;
  options: TakeOption[];
}

interface AttemptData {
  state: "not_started" | "in_progress" | "finished";
  questions?: TakeQuestion[];
  answers?: Record<string, string>;
  remaining_seconds?: number | null;
  question_count?: number;
  duration_minutes?: number | null;
  score?: number;
  passing_score?: number;
  passed?: boolean;
}

function formatTime(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export default function TakeExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = typeof params.id === "string" ? params.id : "";

  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const remainingRef = useRef<number | null>(null);

  const loadState = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/examinations/${examId}/attempt`);
      const data: AttemptData = res.data.data;
      setAttempt(data);
      if (data.answers) setAnswers(data.answers);
      if (data.remaining_seconds != null) {
        setRemaining(data.remaining_seconds);
        remainingRef.current = data.remaining_seconds;
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memuat ujian."));
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Sinkron ulang saat tab kembali fokus (jaga akurasi timer dari server)
  useEffect(() => {
    const onFocus = () => {
      if (attempt?.state === "in_progress") loadState();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [attempt?.state, loadState]);

  // Countdown lokal; saat habis → minta state (server auto-submit)
  useEffect(() => {
    if (attempt?.state !== "in_progress" || remaining == null) return;
    const t = setInterval(() => {
      setRemaining((prev) => {
        const next = prev != null ? prev - 1 : null;
        remainingRef.current = next;
        if (next != null && next <= 0) {
          clearInterval(t);
          loadState(); // server akan auto-submit & kembalikan hasil
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [attempt?.state, remaining != null, loadState]); // eslint-disable-line react-hooks/exhaustive-deps -- interval di-reset saat state berubah

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const res = await api.post(`/api/v1/examinations/${examId}/attempt/start`);
      const data: AttemptData = res.data.data;
      setAttempt(data);
      if (data.answers) setAnswers(data.answers);
      if (data.remaining_seconds != null) setRemaining(data.remaining_seconds);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memulai ujian."));
    } finally {
      setIsStarting(false);
    }
  };

  const handleAnswer = async (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId })); // optimistis
    try {
      await api.post(`/api/v1/examinations/${examId}/attempt/answer`, {
        question_id: questionId,
        option_id: optionId,
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Jawaban gagal tersimpan."));
      loadState();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.post(`/api/v1/examinations/${examId}/attempt/submit`);
      setAttempt(res.data.data);
      setConfirmSubmit(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal mengumpulkan ujian."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!attempt) {
    return <div className="p-6 text-center text-red-500">Ujian tidak dapat dimuat.</div>;
  }

  // ─────── Layar hasil ───────
  if (attempt.state === "finished") {
    const passed = attempt.passed;
    return (
      <div className="max-w-md mx-auto mt-16">
        <Card className="clean-card text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${passed ? "bg-emerald-50" : "bg-red-50"}`}>
              {passed ? (
                <CheckCircle2 className="w-11 h-11 text-emerald-600" />
              ) : (
                <XCircle className="w-11 h-11 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nilai Anda</p>
              <p className={`text-5xl font-bold ${passed ? "text-emerald-600" : "text-red-600"}`}>
                {attempt.score}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Ambang lulus: {attempt.passing_score}
              </p>
            </div>
            <p className={`font-semibold ${passed ? "text-emerald-700" : "text-red-700"}`}>
              {passed ? "SELAMAT — ANDA LULUS" : "BELUM LULUS"}
            </p>
            <Button variant="outline" onClick={() => router.push("/dashboard/examinations")}>
              Kembali ke Daftar Ujian
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────── Layar mulai ───────
  if (attempt.state === "not_started") {
    return (
      <div className="max-w-md mx-auto mt-16">
        <Card className="clean-card text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            <Clock className="w-12 h-12 mx-auto text-blue-900" />
            <h1 className="text-xl font-bold">Siap Mengerjakan Ujian?</h1>
            <p className="text-sm text-muted-foreground">
              {attempt.question_count} soal
              {attempt.duration_minutes ? ` — waktu ${attempt.duration_minutes} menit` : ""}.
              Timer berjalan begitu Anda menekan Mulai dan tidak dapat dijeda.
            </p>
            <Button
              className="w-full bg-blue-900 hover:bg-blue-800 text-white"
              disabled={isStarting}
              onClick={handleStart}
            >
              {isStarting ? "Memulai..." : "Mulai Ujian"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────── Layar pengerjaan ───────
  const questions = attempt.questions || [];
  const current = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-24">
      {/* Header sticky: timer + progres */}
      <div className="sticky top-14 z-30 bg-white dark:bg-slate-900 border rounded-lg px-4 py-3 flex items-center justify-between shadow-sm">
        <span className="text-sm font-medium">
          Terjawab {answeredCount}/{questions.length}
        </span>
        {remaining != null && (
          <span
            className={`flex items-center gap-1.5 font-mono font-bold text-lg ${
              remaining <= 300 ? "text-red-600 animate-pulse" : "text-blue-900 dark:text-blue-300"
            }`}
          >
            <Clock className="w-5 h-5" /> {formatTime(Math.max(0, remaining))}
          </span>
        )}
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setConfirmSubmit(true)}
        >
          <Send className="w-4 h-4 mr-1" /> Kumpulkan
        </Button>
      </div>

      {/* Navigasi soal */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentIdx(i)}
            className={`w-9 h-9 rounded-md text-sm font-medium border transition-colors ${
              i === currentIdx
                ? "bg-blue-900 text-white border-blue-900"
                : answers[q.id]
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-white dark:bg-slate-900 hover:border-blue-500"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Soal aktif */}
      {current && (
        <Card className="clean-card">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium whitespace-pre-wrap">
                <span className="text-muted-foreground mr-2">{currentIdx + 1}.</span>
                {current.question_text}
              </p>
              <span className="shrink-0 text-xs bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
                {current.points} poin
              </span>
            </div>

            <div className="space-y-2">
              {current.options.map((opt, oi) => {
                const selected = answers[current.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleAnswer(current.id, opt.id)}
                    className={`w-full text-left border rounded-lg px-4 py-3 text-sm transition-colors flex items-start gap-3 ${
                      selected
                        ? "border-blue-900 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-900"
                        : "hover:border-blue-400"
                    }`}
                  >
                    <span
                      className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                        selected ? "bg-blue-900 text-white border-blue-900" : "text-muted-foreground"
                      }`}
                    >
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="whitespace-pre-wrap">{opt.option_text}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(currentIdx - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentIdx >= questions.length - 1}
                onClick={() => setCurrentIdx(currentIdx + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Konfirmasi kumpul */}
      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kumpulkan Ujian?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Anda telah menjawab <b>{answeredCount}</b> dari <b>{questions.length}</b> soal.
            {answeredCount < questions.length && " Soal yang belum dijawab dinilai salah."}
            {" "}Setelah dikumpulkan, jawaban tidak dapat diubah.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmSubmit(false)}>Kembali</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? "Mengumpulkan..." : "Ya, Kumpulkan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
