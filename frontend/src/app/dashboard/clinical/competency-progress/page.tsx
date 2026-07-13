"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Target, Search, CheckCircle2, Circle } from "lucide-react";

interface CompetencyItem {
  id: string;
  name: string;
  type: string;
  level?: string | null;
  min_cases: number;
  achieved: number;
  fulfilled: boolean;
}

interface StaseGroup {
  stase_id: string;
  stase_name?: string | null;
  competencies: CompetencyItem[];
}

interface ProgressData {
  student: { id: string; name?: string | null; identity_number?: string | null };
  stases: StaseGroup[];
  overall: { targets: number; fulfilled: number; percent: number } | null;
}

interface StudentOption {
  id: string;
  user?: { name?: string; identity_number?: string } | null;
  cohort?: { name?: string } | null;
}

export default function CompetencyProgressPage() {
  const t = useTranslations("clinicalCompetencyProgress");
  const user = useAuthStore((state) => state.user);
  const isStudent = user?.roles?.includes("Mahasiswa");

  const [data, setData] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Picker mahasiswa (non-mahasiswa)
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);

  const fetchProgress = useCallback(async (studentId?: string) => {
    if (!isStudent && !studentId) return;
    setIsLoading(true);
    try {
      const res = await api.get("/api/v1/clinical/competency-progress", {
        params: studentId ? { student_id: studentId } : {},
      });
      setData(res.data.data);
    } catch (err) {
      setData(null);
      toast.error(getApiErrorMessage(err, t("errLoad")));
    } finally {
      setIsLoading(false);
    }
  }, [isStudent, t]);

  useEffect(() => {
    if (isStudent) fetchProgress();
  }, [isStudent, fetchProgress]);

  // Cari mahasiswa (debounce) untuk peran non-mahasiswa
  useEffect(() => {
    if (isStudent) return;
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/api/v1/academic/students", {
          params: { per_page: 10, ...(studentSearch ? { search: studentSearch } : {}) },
        });
        setStudentOptions(res.data.data || []);
      } catch {
        setStudentOptions([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [studentSearch, isStudent]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("subtitle")}
        </p>
      </div>

      {!isStudent && (
        <Card className="clean-card">
          <CardContent className="pt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder={t("searchStudent")}
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {studentOptions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedStudent(s.id);
                    fetchProgress(s.id);
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedStudent === s.id
                      ? "bg-blue-900 text-white border-blue-900"
                      : "bg-white dark:bg-slate-900 hover:border-blue-500"
                  }`}
                >
                  {s.user?.name} <span className="opacity-70">({s.user?.identity_number})</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : !data ? (
        !isStudent && (
          <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            <Target className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>{t("selectStudentPrompt")}</p>
          </div>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="font-semibold">{data.student.name}</p>
              <p className="text-xs text-muted-foreground">{data.student.identity_number}</p>
            </div>
            {data.overall && (
              <Badge
                className={`ml-auto text-sm px-3 py-1 ${
                  data.overall.percent >= 100
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {t("targetsAchieved", { fulfilled: data.overall.fulfilled, targets: data.overall.targets, percent: data.overall.percent })}
              </Badge>
            )}
          </div>

          {data.stases.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              <Target className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p>{t("noTargets")}</p>
              <p className="text-xs mt-1">
                {t("noTargetsHint")}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.stases.map((group) => (
                <Card key={group.stase_id} className="clean-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{group.stase_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {group.competencies.map((c) => (
                      <div key={c.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex items-center gap-1.5 min-w-0">
                            {c.fulfilled ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                            )}
                            <span className="truncate">
                              {c.name}
                              {c.level ? <span className="text-xs text-muted-foreground">{t("skdiSuffix", { level: c.level })}</span> : null}
                            </span>
                          </span>
                          <span className={`shrink-0 text-xs font-medium ${c.fulfilled ? "text-emerald-600" : "text-slate-500"}`}>
                            {c.achieved}/{c.min_cases}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${c.fulfilled ? "bg-emerald-500" : "bg-blue-900"}`}
                            style={{ width: `${Math.min((c.achieved / c.min_cases) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
