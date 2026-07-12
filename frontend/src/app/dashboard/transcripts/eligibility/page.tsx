"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Cohort } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ClipboardCheck, Loader2, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EligibilityRow {
  user_id: string;
  name: string;
  nim: string;
  status: string;
  eligible: boolean;
  failed: string[];
}

interface BatchResult {
  total: number;
  eligible: number;
  students: EligibilityRow[];
}

const selectClass =
  "flex h-10 w-full sm:w-72 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

/**
 * Panel sidang yudisium: cek kelayakan seluruh mahasiswa satu angkatan
 * terhadap syarat kelulusan (nilai stase, logbook, kompetensi, penilaian,
 * presensi). Endpoint digating manage-grades.
 */
export default function YudisiumEligibilityPage() {
  const t = useTranslations("yudisiumEligibility");
  const tc = useTranslations("common");
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortId, setCohortId] = useState("");
  const [result, setResult] = useState<BatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    api
      .get("/api/v1/academic/cohorts")
      .then((res) => setCohorts(res.data.data || res.data))
      .catch(() => toast.error(t("loadCohortsError")));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sekali saat mount
  }, []);

  const runCheck = async () => {
    if (!cohortId) return;
    setIsLoading(true);
    setResult(null);
    try {
      const res = await api.get("/api/v1/yudisium/eligibility-batch", {
        params: { cohort_id: cohortId },
      });
      setResult(res.data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("checkError")));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("subtitle")}
        </p>
      </div>

      <Card className="clean-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-900 dark:text-blue-300" /> {t("selectCohortTitle")}
          </CardTitle>
          <CardDescription>
            {t("requirementsDesc")}
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <select className={selectClass} value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
              <option value="">{t("selectCohortPlaceholder")}</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Button
              onClick={runCheck}
              disabled={!cohortId || isLoading}
              className="bg-blue-900 hover:bg-blue-800 text-white"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("checking")}</>
              ) : (
                <><Search className="w-4 h-4 mr-2" /> {t("checkButton")}</>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {result && (
        <>
          <div className="flex flex-wrap gap-3 text-sm">
            <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 text-sm px-3 py-1">
              {t("totalBadge", { count: result.total })}
            </Badge>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-sm px-3 py-1">
              {t("eligibleBadge", { count: result.eligible })}
            </Badge>
            <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-sm px-3 py-1">
              {t("notEligibleBadge", { count: result.total - result.eligible })}
            </Badge>
          </div>

          <div className="rounded-md border bg-white dark:bg-gray-900 overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("nim")}</TableHead>
                  <TableHead>{tc("name")}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                  <TableHead>{t("eligibilityCol")}</TableHead>
                  <TableHead>{t("unmetRequirements")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500 py-10">
                      {t("emptyCohort")}
                    </TableCell>
                  </TableRow>
                ) : (
                  result.students.map((row) => (
                    <TableRow key={row.user_id}>
                      <TableCell className="font-medium whitespace-nowrap">{row.nim || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.name}</TableCell>
                      <TableCell className="whitespace-nowrap capitalize">{row.status}</TableCell>
                      <TableCell>
                        {row.eligible ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {t("eligibleTag")}
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                            {t("notEligibleTag")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.failed.length === 0 ? "—" : row.failed.join(" · ")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
