"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Exam } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, UserCircle2 } from "lucide-react";

export default function AssessorExamPage() {
  const t = useTranslations("examAssess");
  const tc = useTranslations("common");
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<string>("");
  
  const [score, setScore] = useState<string>("");
  const [rubricScores, setRubricScores] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExamDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- muat ulang hanya saat params.id berubah
  }, [params.id]);

  const fetchExamDetail = async () => {
    try {
      const res = await api.get(`/api/v1/examinations/${params.id}`);
      setExam(res.data.data);
    } catch (err) {
      console.error("Failed to fetch exam", err);
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  };

  const myAssessorRole = exam?.assessors?.find((a) => a.assessor_id === user?.id);
  const stationAssigned = myAssessorRole?.exam_station;
  const rubricTemplate = stationAssigned?.assessment_template;
  const isRubricMode = !!rubricTemplate;


  // Calculate dynamic total score if rubric mode
  const calculatedTotalScore = () => {
    if (!isRubricMode) return score ? parseFloat(score) : 0;
    
    const indicators = rubricTemplate?.rubric_schema?.indicators || [];
    let total = 0;
    indicators.forEach((ind) => {
        const val = parseFloat(rubricScores[ind.key] || "0");
        const weight = ind.weight || 0;
        const maxScore = ind.max_score || 100;
        if (ind.weight !== undefined) {
            total += (val / maxScore) * weight;
        } else {
            total += val;
        }
    });
    return total;
  };

  const handleSubmitScore = async () => {
    if (!selectedParticipant) {
      toast.error(t("selectParticipantFirst"));
      return;
    }

    if (!isRubricMode && !score) {
        toast.error(t("enterFinalScore"));
        return;
    }

    if (!exam) return;
    setSubmitting(true);
    try {
      await api.post(`/api/v1/examinations/${exam.id}/scores`, {
        exam_participant_id: selectedParticipant,
        exam_station_id: stationAssigned?.id || null,
        score: isRubricMode ? null : parseFloat(score),
        rubric_scores: isRubricMode ? rubricScores : null,
        feedback: feedback
      });
      toast.success(t("scoreSaved"));
      
      await fetchExamDetail();
      
      setScore("");
      setRubricScores({});
      setFeedback("");
      setSelectedParticipant("");
    } catch (err) {
      toast.error(t("scoreSaveError") + getApiErrorMessage(err, err instanceof Error ? err.message : t("errorOccurred")));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-12 w-1/3 mb-6" /><Skeleton className="h-96 w-full" /></div>;
  if (!exam) return <div className="text-red-500">{t("notFound")}</div>;
  if (!myAssessorRole) return <div className="text-red-500">{t("notAssessor")}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.push('/dashboard/examinations')} className="mb-2 -ml-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> {tc("back")}
      </Button>

      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{t("title")}</h1>
          <h2 className="text-xl text-muted-foreground">{exam.name}</h2>
        </div>
        <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 text-right">
          <p className="text-sm font-medium text-primary uppercase">{t("yourRole")}</p>
          <p className="font-bold">
            {stationAssigned ? t("examinerStation", { name: stationAssigned.name ?? "" }) : t("examinerGlobal")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="md:col-span-1 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-muted-foreground" /> {t("selectParticipant")}
          </h3>
          <div className="space-y-2">
            {exam.participants?.map((p) => {
              const myScore = p.scores?.find((s) => s.assessor_id === user?.id && s.exam_station_id === (stationAssigned?.id || null));
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedParticipant(p.id);
                    if (myScore) {
                      setScore(String(myScore.score ?? ""));
                      setFeedback(myScore.feedback || "");
                      
                      // For rubric mode, we need to load detailed scores if available
                      // Since we didn't eager load 'details' deep inside participants.scores initially,
                      // For this simple UI, we might just leave the inputs empty or fetch details individually.
                      // Let's reset for now.
                      setRubricScores({});
                    } else {
                      setScore("");
                      setRubricScores({});
                      setFeedback("");
                    }
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all relative ${
                    selectedParticipant === p.id 
                      ? "bg-primary/10 border-primary ring-1 ring-primary" 
                      : "bg-card hover:bg-muted"
                  }`}
                >
                  <div className="font-medium text-sm">{p.student?.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t("studentNim", { nim: p.student?.id.substring(0, 8) ?? "" })}
                  </div>
                  {myScore && (
                    <Badge className="absolute top-2 right-2" variant="default">{Number(myScore.score).toFixed(2)}</Badge>
                  )}
                </button>
              );
            })}
            
            {exam.participants?.length === 0 && (
              <p className="text-sm text-muted-foreground italic">{t("noParticipants")}</p>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          {selectedParticipant ? (
            <Card className="border-primary/20 shadow-sm">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle>{t("assessmentSheet")}</CardTitle>
                <CardDescription>
                  {t.rich("participantLabel", {
                    name: exam.participants?.find((p) => p.id === selectedParticipant)?.student?.name ?? "",
                    b: (chunks) => <span className="font-bold text-foreground">{chunks}</span>,
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {stationAssigned && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900/50 mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-semibold text-yellow-800 dark:text-yellow-500 mb-1">
                              {t("stationHeading", { name: stationAssigned.name ?? "" })}
                            </h4>
                            <p className="text-sm text-yellow-700 dark:text-yellow-400">
                            {stationAssigned.description || t("noSpecificDescription")}
                            </p>
                        </div>
                        {isRubricMode && (
                            <Badge variant="secondary">{rubricTemplate?.name}</Badge>
                        )}
                    </div>
                  </div>
                )}

                {isRubricMode ? (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">{t("rubricTitle")}</h3>
                        {rubricTemplate?.rubric_schema?.indicators?.map((ind) => (
                            <div key={ind.key} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 border rounded-lg bg-card">
                                <div>
                                    <Label className="text-base font-medium">{ind.label}</Label>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {t("maxScore", { max: ind.max_score ?? "-" })} {ind.weight !== undefined && t("weightSuffix", { weight: ind.weight })}
                                    </div>
                                </div>
                                <Input 
                                    type="number"
                                    min="0" max={ind.max_score}
                                    placeholder={`0 - ${ind.max_score}`}
                                    value={rubricScores[ind.key] || ""}
                                    onChange={(e) => setRubricScores({...rubricScores, [ind.key]: e.target.value})}
                                    className="w-full md:w-32"
                                />
                            </div>
                        ))}
                        
                        <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg border border-primary/20 mt-4">
                            <span className="font-semibold">{t("estTotalScore")}</span>
                            <span className="text-2xl font-bold text-primary">{calculatedTotalScore().toFixed(2)}</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                    <Label htmlFor="score" className="text-base font-semibold">{t("finalScoreLabel")} <span className="text-red-500">*</span></Label>
                    <Input
                        id="score"
                        type="number"
                        min="0" max="100" step="0.01"
                        placeholder={t("finalScorePlaceholder")}
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        className="text-lg w-full md:w-1/2"
                    />
                    </div>
                )}

                <div className="space-y-3 pt-4 border-t">
                  <Label htmlFor="feedback" className="text-base font-semibold">{t("feedbackLabel")}</Label>
                  <Textarea
                    id="feedback"
                    placeholder={t("feedbackPlaceholder")}
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{t("feedbackHint")}</p>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 flex justify-end gap-3 rounded-b-xl border-t">
                <Button variant="outline" onClick={() => setSelectedParticipant("")}>{tc("cancel")}</Button>
                <Button
                  onClick={handleSubmitScore}
                  disabled={submitting || (!isRubricMode && !score)}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" /> {t("saveScore")}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-xl bg-muted/10">
              <UserCircle2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-1">{t("noParticipantSelected")}</h3>
              <p className="text-sm text-muted-foreground">{t("noParticipantSelectedHint")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
