"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Star, FileText, CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { EvaluationQuestion, RotationAssignment } from "@/lib/types";

export default function EvaluationsPage() {
  const t = useTranslations("clinicalEvaluations");
  const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
  const [rotation, setRotation] = useState<RotationAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, { rating: number, comment: string }>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // We use attendance status to get current active rotation
        const statusRes = await api.get("/api/v1/clinical/attendance/status");
        
        if (statusRes.data.rotation) {
          setRotation(statusRes.data.rotation);
          
          // Check if already submitted
          const evalStatus = await api.get(`/api/v1/clinical/evaluations/status/${statusRes.data.rotation.id}`);
          if (evalStatus.data.is_submitted) {
            setIsSubmitted(true);
          } else {
            // Load questions
            const qRes = await api.get("/api/v1/clinical/evaluations/questions");
            setQuestions(qRes.data.data);
            
            // Initialize answers state
            const initial: Record<string, { rating: number; comment: string }> = {};
            qRes.data.data.forEach((q: EvaluationQuestion) => {
              initial[q.id] = { rating: 0, comment: "" };
            });
            setAnswers(initial);
          }
        }
      } catch {
        toast.error(t("errLoad"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sekali saat mount
  }, []);

  const handleRating = (questionId: string, rating: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], rating }
    }));
  };

  const handleComment = (questionId: string, comment: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], comment }
    }));
  };

  const handleSubmit = async () => {
    // Validasi
    const unanswered = Object.values(answers).some(a => a.rating === 0);
    if (unanswered) {
      toast.error(t("errRatingRequired"));
      return;
    }

    if (!rotation) return;
    setSubmitting(true);
    try {
      const payload = {
        rotation_assignment_id: rotation.id,
        evaluations: questions.map(q => ({
          question_id: q.id,
          target_id: "00000000-0000-0000-0000-000000000000", // Dummy for now, should be real Preceptor ID or Hospital ID
          target_type: q.target_type, // 'App\\Models\\User' or 'Modules\\Rotation\\Models\\Hospital'
          rating: answers[q.id].rating,
          comment: answers[q.id].comment
        }))
      };

      const res = await api.post("/api/v1/clinical/evaluations/submit", payload);
      toast.success(res.data.message);
      setIsSubmitted(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("errSubmit")));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><FileText className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  if (!rotation) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <Card className="border-dashed bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">{t("noRotationTitle")}</h3>
            <p className="text-muted-foreground">{t("noRotationDesc")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-bold text-green-700 dark:text-green-400">{t("doneTitle")}</h3>
            <p className="text-muted-foreground mt-2">
              {t("doneDesc", { hospital: rotation.hospital?.name ?? "" })}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("titleStase")}</h1>
        <p className="text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>{t("currentStase")}</CardTitle>
          <CardDescription>{rotation.hospital?.name}</CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-6">
        {questions.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">{t("noQuestions")}</div>
        ) : (
          questions.map((q, idx) => (
            <Card key={q.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm shrink-0">
                    {idx + 1}
                  </span>
                  {q.question_text}
                </CardTitle>
                <CardDescription>
                  {t("evaluationOf", { target: q.target_type === 'Modules\\Rotation\\Models\\Hospital' ? t("targetHospital") : t("targetPreceptor") })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRating(q.id, star)}
                      className={`p-2 transition-colors hover:text-amber-500 ${answers[q.id]?.rating >= star ? 'text-amber-400' : 'text-muted-foreground/30'}`}
                    >
                      <Star className="w-8 h-8 fill-current" />
                    </button>
                  ))}
                  <span className="ml-4 self-center text-sm font-medium text-muted-foreground">
                    {answers[q.id]?.rating === 0 ? t("notRated") : t("ratingValue", { rating: answers[q.id].rating })}
                  </span>
                </div>
                <div>
                  <Textarea
                    placeholder={t("commentPlaceholder")}
                    className="resize-none"
                    value={answers[q.id]?.comment || ""}
                    onChange={(e) => handleComment(q.id, e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {questions.length > 0 && (
        <div className="flex justify-end">
          <Button size="lg" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t("submitting") : t("submitEvaluation")}
          </Button>
        </div>
      )}
    </div>
  );
}
