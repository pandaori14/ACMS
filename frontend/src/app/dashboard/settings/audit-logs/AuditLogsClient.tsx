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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search, ChevronLeft, ChevronRight, Eye, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface AuditActor {
  id: string;
  name: string;
  email: string;
}

interface AuditLog {
  id: string;
  action: string;
  actor: AuditActor | null;
  actor_id: string | null;
  actor_role: string | null;
  target_type: string | null;
  target_fqcn: string | null;
  target_id: string | null;
  old_payload: Record<string, unknown> | null;
  new_payload: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string | null;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  total: number;
}

// Color-code by action domain prefix.
function actionVariant(action: string): string {
  const prefix = action.split(".")[0];
  switch (prefix) {
    case "grade":
    case "assessment":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "clinical":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
    case "rotation":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "finance":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300";
    case "auth":
    case "security":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300";
    case "audit":
      return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("id-ID");
}

export default function AuditLogsClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ current_page: 1, last_page: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Detail dialog
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/v1/audit-logs", {
        params: {
          page,
          q: q || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      });
      setLogs(res.data.data ?? []);
      if (res.data.meta) {
        setMeta({
          current_page: res.data.meta.current_page,
          last_page: res.data.meta.last_page,
          total: res.data.meta.total,
        });
      }
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        toast.error("Anda tidak memiliki izin untuk melihat audit trail.");
      } else {
        toast.error("Gagal memuat audit trail.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, q, from, to]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px] space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Cari aksi / target</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="contoh: grade.stase.adjusted"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Dari tanggal</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Sampai tanggal</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button type="submit">
          <Search className="w-4 h-4 mr-2" /> Terapkan
        </Button>
      </form>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[170px]">Waktu</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Aktor</TableHead>
              <TableHead>Target</TableHead>
              <TableHead className="w-[130px]">IP</TableHead>
              <TableHead className="text-right w-[80px]">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  Belum ada catatan audit.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${actionVariant(log.action)}`}>
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.actor ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{log.actor.name}</span>
                        {log.actor_role && (
                          <span className="text-xs text-muted-foreground">{log.actor_role}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Sistem</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.target_type ? (
                      <div className="flex flex-col">
                        <span className="text-sm">{log.target_type}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {log.target_id?.slice(0, 8)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.ip_address ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setSelected(log)}>
                      <Eye className="w-4 h-4 text-blue-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
              Detail Audit
            </DialogTitle>
            <DialogDescription>
              {selected && (
                <span className="font-mono text-xs">{selected.action}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Waktu" value={formatDate(selected.created_at)} />
                <Field label="IP Address" value={selected.ip_address ?? "-"} mono />
                <Field label="Aktor" value={selected.actor?.name ?? "Sistem"} />
                <Field label="Peran" value={selected.actor_role ?? "-"} />
                <Field label="Target" value={selected.target_fqcn ?? "-"} mono />
                <Field label="Target ID" value={selected.target_id ?? "-"} mono />
              </div>

              <PayloadBlock title="State Sebelum (old)" data={selected.old_payload} />
              <PayloadBlock title="State Sesudah (new)" data={selected.new_payload} />
              <PayloadBlock title="Metadata" data={selected.metadata} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={mono ? "font-mono text-xs break-all" : "text-sm"}>{value}</p>
    </div>
  );
}

function PayloadBlock({ title, data }: { title: string; data: Record<string, unknown> | null }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
      <pre className="bg-slate-50 dark:bg-slate-900 border rounded-md p-3 text-xs overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
