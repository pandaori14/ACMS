"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronLeft, ChevronRight, AlertTriangle, MapPin } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface RecapRow {
  id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_distance: number | null;
  check_out_distance: number | null;
  status: string;
  is_flagged: boolean;
  flag_reason: string | null;
  rotation_assignment: {
    student?: { user?: { name?: string; identity_number?: string } | null } | null;
    hospital?: { name?: string } | null;
    stase?: { name?: string } | null;
  } | null;
}

interface Pagination {
  current_page: number;
  last_page: number;
  total: number;
}

function statusBadge(status: string): string {
  switch (status.toUpperCase()) {
    case "PRESENT":
      return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
    case "LATE":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "ABSENT":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("id-ID");
}

export default function RecapClient() {
  const [rows, setRows] = useState<RecapRow[]>([]);
  const [meta, setMeta] = useState<Pagination>({ current_page: 1, last_page: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [date, setDate] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const fetchRecap = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/v1/clinical/attendance/recap", {
        params: {
          page,
          date: date || undefined,
          flagged_only: flaggedOnly ? true : undefined,
        },
      });
      setRows(res.data.data ?? []);
      setMeta({
        current_page: res.data.current_page ?? 1,
        last_page: res.data.last_page ?? 1,
        total: res.data.total ?? 0,
      });
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      toast.error(status === 403 ? "Anda tidak memiliki izin untuk rekap presensi." : "Gagal memuat rekap presensi.");
    } finally {
      setIsLoading(false);
    }
  }, [page, date, flaggedOnly]);

  useEffect(() => {
    fetchRecap();
  }, [fetchRecap]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tanggal</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => {
              setPage(1);
              setDate(e.target.value);
            }}
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
          <Checkbox
            checked={flaggedOnly}
            onCheckedChange={(c) => {
              setPage(1);
              setFlaggedOnly(c === true);
            }}
          />
          Hanya yang ditandai (anomali GPS)
        </label>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Tanggal</TableHead>
              <TableHead>Mahasiswa</TableHead>
              <TableHead>RS / Stase</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  Tidak ada catatan presensi.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const student = row.rotation_assignment?.student?.user;
                return (
                  <TableRow key={row.id} className={row.is_flagged ? "bg-rose-50/50 dark:bg-rose-950/10" : ""}>
                    <TableCell className="text-xs whitespace-nowrap">{formatDate(row.date)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{student?.name ?? "-"}</span>
                        <span className="text-xs text-muted-foreground font-mono">{student?.identity_number ?? ""}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span>{row.rotation_assignment?.hospital?.name ?? "-"}</span>
                        <span className="text-muted-foreground">{row.rotation_assignment?.stase?.name ?? ""}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.check_in_time ? (
                        <div className="flex flex-col">
                          <span>{row.check_in_time}</span>
                          {row.check_in_distance != null && (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {Math.round(row.check_in_distance)} m
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.check_out_time ? (
                        <div className="flex flex-col">
                          <span>{row.check_out_time}</span>
                          {row.check_out_distance != null && (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {Math.round(row.check_out_distance)} m
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium w-fit ${statusBadge(row.status)}`}>
                          {row.status}
                        </span>
                        {row.is_flagged && (
                          <span
                            className="flex items-center gap-1 text-xs text-rose-600 font-medium"
                            title={row.flag_reason ?? "Anomali terdeteksi"}
                          >
                            <AlertTriangle className="w-3 h-3" /> Ditandai
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Total {meta.total} catatan &middot; Halaman {meta.current_page} dari {meta.last_page}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={meta.current_page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="w-4 h-4" /> Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={meta.current_page >= meta.last_page || isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
