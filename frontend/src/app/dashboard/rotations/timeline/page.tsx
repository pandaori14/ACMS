"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Cohort } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CalendarRange, Loader2, Search } from "lucide-react";

interface MatrixCell {
  assignment_id: string;
  stase?: string | null;
  hospital?: string | null;
  color?: string | null;
  status: string;
  attempt_number?: number;
}

interface MatrixRow {
  student_id: string;
  name?: string | null;
  identity_number?: string | null;
  cells: Record<string, MatrixCell>;
}

interface MatrixPeriod {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
}

const FALLBACK_COLORS = ["#1E3A8A", "#0F766E", "#B45309", "#7C3AED", "#BE123C", "#15803D", "#0369A1", "#A16207"];

const selectClass =
  "flex h-10 w-full sm:w-72 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

/**
 * Timeline rotasi: matriks mahasiswa × periode — overview visual seluruh
 * perjalanan stase satu angkatan (warna per stase, badge remedial).
 */
export default function RotationTimelinePage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortId, setCohortId] = useState("");
  const [periods, setPeriods] = useState<MatrixPeriod[]>([]);
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get("/api/v1/academic/cohorts").then((res) => setCohorts(res.data.data || res.data)).catch(() => {});
  }, []);

  const staseColor = (name?: string | null, explicit?: string | null): string => {
    if (explicit) return explicit;
    if (!name) return "#64748B";
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
  };

  const load = async () => {
    if (!cohortId) return;
    setIsLoading(true);
    try {
      const res = await api.get("/api/v1/rotation/schedule-matrix", {
        params: { cohort_id: cohortId },
      });
      setPeriods(res.data.data.periods || []);
      setRows(res.data.data.rows || []);
      setLoaded(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memuat timeline."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Timeline Rotasi</h1>
        <p className="text-muted-foreground mt-1">
          Peta perjalanan stase satu angkatan: baris mahasiswa, kolom periode. Warna = stase;
          sel bertanda ↻ adalah remedial.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <select className={selectClass} value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
          <option value="">Pilih Angkatan</option>
          {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button onClick={load} disabled={!cohortId || isLoading} className="bg-blue-900 hover:bg-blue-800 text-white">
          {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memuat...</> : <><Search className="w-4 h-4 mr-2" /> Tampilkan</>}
        </Button>
      </div>

      {loaded && (
        periods.length === 0 ? (
          <div className="rounded-md border bg-white dark:bg-gray-900 py-12 text-center">
            <CalendarRange className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Angkatan ini belum memiliki penempatan rotasi.</p>
          </div>
        ) : (
          <div className="rounded-md border bg-white dark:bg-gray-900 overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[720px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-r px-3 py-2 text-left font-semibold min-w-[180px]">
                    Mahasiswa
                  </th>
                  {periods.map((p) => (
                    <th key={p.id} className="border-b border-r px-3 py-2 text-left font-semibold min-w-[150px] bg-slate-50 dark:bg-slate-900">
                      {p.name}
                      <span className="block text-[10px] font-normal text-slate-400">
                        {p.start_date?.slice(0, 10)} — {p.end_date?.slice(0, 10)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.student_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 border-b border-r px-3 py-1.5 whitespace-nowrap">
                      <span className="font-medium">{row.name || "-"}</span>
                      <span className="block text-[11px] text-slate-400">{row.identity_number}</span>
                    </td>
                    {periods.map((p) => {
                      const cell = row.cells[p.id];
                      return (
                        <td key={p.id} className="border-b border-r px-1.5 py-1.5 align-top">
                          {cell ? (
                            <div
                              className="rounded-md px-2 py-1 text-white text-xs leading-tight"
                              style={{ backgroundColor: staseColor(cell.stase, cell.color) }}
                              title={`${cell.stase} @ ${cell.hospital} (${cell.status})`}
                            >
                              <span className="font-semibold">
                                {cell.stase}
                                {(cell.attempt_number ?? 1) > 1 && " ↻"}
                              </span>
                              <span className="block opacity-80 truncate">{cell.hospital}</span>
                            </div>
                          ) : (
                            <span className="block text-center text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
