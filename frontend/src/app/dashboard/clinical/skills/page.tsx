"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { useAuthStore } from "@/store/useAuthStore";
import { Student } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ClipboardCheck, Loader2, Search } from "lucide-react";

interface SkillItemRow {
  item_id: string;
  name: string;
  description?: string | null;
  level: string | null;
  notes?: string | null;
  assessed_by?: string | null;
  assessed_at?: string | null;
}

interface StaseGroup {
  stase: string;
  total: number;
  assessed: number;
  items: SkillItemRow[];
}

interface ReferenceItem {
  id: string;
  name: string;
  value: string;
}

const LEVEL_BADGE: Record<string, string> = {
  not_observed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  below_expected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  at_expected: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  above_expected: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

const selectClass =
  "flex h-9 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background";

/**
 * Skill Checklist per stase:
 * - Mahasiswa: melihat progres observasi skill dirinya.
 * - Dodiknis/penilai (create-assessments): pilih mahasiswa → isi level observasi.
 */
export default function SkillChecklistPage() {
  const t = useTranslations("clinicalSkills");
  const tc = useTranslations("common");
  const user = useAuthStore((state) => state.user);
  const isStudent = user?.roles?.includes("Mahasiswa") ?? false;
  const canAssess = user?.permissions?.includes("create-assessments") ?? false;

  const [stases, setStases] = useState<StaseGroup[]>([]);
  const [studentName, setStudentName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [levels, setLevels] = useState<ReferenceItem[]>([]);

  // Pemilihan mahasiswa (non-mahasiswa)
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [savingItem, setSavingItem] = useState<string | null>(null);

  const levelLabel = (value: string | null) =>
    value ? levels.find((l) => l.value === value)?.name || value : t("notObserved");

  const fetchProgress = useCallback(async (studentId?: string) => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/v1/clinical/skills/progress", {
        params: studentId ? { student_id: studentId } : {},
      });
      setStases(res.data.data.stases || []);
      setStudentName(res.data.data.student?.name || "");
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("errLoadProgress")));
      setStases([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    api
      .get("/api/references/skill_levels")
      .then((res) => setLevels(res.data.data || []))
      .catch(() => toast.error(t("errLoadLevels")));
    if (isStudent) fetchProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sekali saat mount per peran
  }, [isStudent, fetchProgress]);

  const searchStudents = async () => {
    try {
      const res = await api.get("/api/v1/academic/students", {
        params: { search, per_page: 10 },
      });
      setCandidates(res.data.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("errSearch")));
    }
  };

  const assess = async (itemId: string, level: string) => {
    if (!selectedId) return;
    setSavingItem(itemId);
    try {
      await api.post("/api/v1/clinical/skills/assess", {
        student_id: selectedId,
        skill_checklist_item_id: itemId,
        level,
      });
      toast.success(t("successSave"));
      fetchProgress(selectedId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("errSave")));
    } finally {
      setSavingItem(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">
          {isStudent ? t("subtitleStudent") : t("subtitleAssessor")}
        </p>
      </div>

      {!isStudent && (
        <Card className="clean-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("selectStudentTitle")}</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchStudents()}
                className="sm:w-72"
              />
              <Button variant="outline" onClick={searchStudents}>
                <Search className="w-4 h-4 mr-1" /> {tc("search")}
              </Button>
              {candidates.length > 0 && (
                <select
                  className={`${selectClass} h-10 sm:w-72`}
                  value={selectedId}
                  onChange={(e) => {
                    setSelectedId(e.target.value);
                    if (e.target.value) fetchProgress(e.target.value);
                  }}
                >
                  <option value="">{t("selectStudent")}</option>
                  {candidates.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user?.name} ({s.user?.identity_number})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : stases.length === 0 ? (
        <Card className="clean-card">
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {isStudent ? t("emptyStudent") : t("emptyAssessor")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {studentName && !isStudent && (
            <p className="text-sm text-muted-foreground">
              {t.rich("showingFor", {
                name: studentName,
                b: (c) => <span className="font-semibold text-foreground">{c}</span>,
              })}
            </p>
          )}
          {stases.map((group) => (
            <Card key={group.stase} className="clean-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{group.stase}</span>
                  <Badge
                    className={
                      group.assessed === group.total
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    }
                  >
                    {t("observed", { assessed: group.assessed, total: group.total })}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {group.items.map((item) => (
                    <li key={item.item_id} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                        {item.assessed_by && (
                          <p className="text-xs text-slate-400">
                            {t("assessedBy", { name: item.assessed_by })}
                            {item.assessed_at
                              ? ` — ${new Date(item.assessed_at).toLocaleDateString("id-ID")}`
                              : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-none">
                        <Badge className={LEVEL_BADGE[item.level || "not_observed"]}>
                          {levelLabel(item.level)}
                        </Badge>
                        {canAssess && selectedId && (
                          <select
                            className={selectClass}
                            disabled={savingItem === item.item_id}
                            value=""
                            onChange={(e) => e.target.value && assess(item.item_id, e.target.value)}
                          >
                            <option value="">{t("setLevel")}</option>
                            {levels.map((l) => (
                              <option key={l.id} value={l.value}>{l.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
