"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Building2, Users } from "lucide-react";

interface AssignmentRow {
  id: string;
  status: string;
  student?: { user?: { name?: string; identity_number?: string } | null } | null;
  stase?: { id: string; name?: string } | null;
  hospital?: { id: string; name?: string } | null;
  preceptor?: { name?: string } | null;
  rotation_period?: { id: string; name?: string; start_date?: string; end_date?: string } | null;
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-700",
  remedial: "bg-orange-100 text-orange-700",
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

export default function HospitalStudentsPage() {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterStase, setFilterStase] = useState("");

  useEffect(() => {
    // Backend otomatis membatasi ke RS milik Admin RS
    api.get("/api/v1/rotation/assignments")
      .then((res) => setRows(res.data.data || []))
      .catch((err) => toast.error(getApiErrorMessage(err, "Gagal memuat data mahasiswa.")))
      .finally(() => setIsLoading(false));
  }, []);

  const periods = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => r.rotation_period && map.set(r.rotation_period.id, r.rotation_period.name || "-"));
    return Array.from(map.entries());
  }, [rows]);

  const staseOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => r.stase && map.set(r.stase.id, r.stase.name || "-"));
    return Array.from(map.entries());
  }, [rows]);

  const filtered = rows.filter(
    (r) =>
      (!filterPeriod || r.rotation_period?.id === filterPeriod) &&
      (!filterStase || r.stase?.id === filterStase)
  );

  // Kelompokkan per stase
  const grouped = useMemo(() => {
    const map = new Map<string, AssignmentRow[]>();
    filtered.forEach((r) => {
      const key = r.stase?.name || "Tanpa Stase";
      map.set(key, [...(map.get(key) || []), r]);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const hospitalNames = useMemo(
    () => Array.from(new Set(rows.map((r) => r.hospital?.name).filter(Boolean))),
    [rows]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mahasiswa di RS Saya</h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          {hospitalNames.length > 0 ? hospitalNames.join(", ") : "Rumah sakit Anda"} — koass yang sedang/pernah dirotasi.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <select className={selectClass} value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
          <option value="">Semua Periode</option>
          {periods.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select className={selectClass} value={filterStase} onChange={(e) => setFilterStase(e.target.value)}>
          <option value="">Semua Stase</option>
          {staseOptions.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="w-4 h-4 mr-2" /> {filtered.length} penempatan
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="py-14 text-center text-muted-foreground border-2 border-dashed rounded-xl">
          <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p>Belum ada mahasiswa yang dirotasi ke rumah sakit Anda.</p>
          <p className="text-xs mt-1">
            Pastikan akun Anda tertaut ke rumah sakit (hubungi admin program studi).
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {grouped.map(([staseName, list]) => (
            <Card key={staseName} className="clean-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{staseName}</span>
                  <Badge variant="secondary">{list.length} mhs</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border rounded-md p-3 text-sm gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.student?.user?.name || "-"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.student?.user?.identity_number || ""}
                        {r.rotation_period?.name ? ` — ${r.rotation_period.name}` : ""}
                        {r.preceptor?.name ? ` — Pembimbing: ${r.preceptor.name}` : ""}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${STATUS_BADGE[r.status] || "bg-slate-100 text-slate-700"}`}>
                      {r.status.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
