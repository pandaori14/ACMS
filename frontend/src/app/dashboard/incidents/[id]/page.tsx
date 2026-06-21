"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import {
  ArrowLeft, ShieldAlert, UserX, Download, Lock, MessageSquarePlus,
  AlertTriangle, Flame, Clock, CheckCircle2,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import type { IncidentReport, IncidentNote, IncidentStatus } from "@/types/incident";
import { STATUS_LABELS, SEVERITY_LABELS } from "@/types/incident";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-blue-500 text-white",
};

function getStatusBadge(status: IncidentStatus) {
  switch (status) {
    case "submitted": return <Badge variant="destructive">{STATUS_LABELS.submitted}</Badge>;
    case "investigating": return <Badge className="bg-amber-500 text-white">{STATUS_LABELS.investigating}</Badge>;
    case "resolved": return <Badge className="bg-green-600 text-white">{STATUS_LABELS.resolved}</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function IncidentDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const permissions = useAuthStore((s) => s.user?.permissions) ?? [];
  const canManage = permissions.includes("manage-incidents");

  const [incident, setIncident] = useState<IncidentReport | null>(null);
  const [notes, setNotes] = useState<IncidentNote[]>([]);
  const [loading, setLoading] = useState(true);

  const [newStatus, setNewStatus] = useState<string>("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [newNote, setNewNote] = useState("");
  const [noteInternal, setNoteInternal] = useState(true);
  const [addingNote, setAddingNote] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [incidentRes, notesRes] = await Promise.all([
        api.get(`/api/v1/incidents/${id}`),
        canManage ? api.get(`/api/v1/incidents/${id}/notes`) : Promise.resolve({ data: { data: [] } }),
      ]);
      setIncident(incidentRes.data.data);
      setNotes(notesRes.data.data ?? []);
    } catch {
      toast.error("Gagal memuat detail laporan");
    } finally {
      setLoading(false);
    }
  }, [id, canManage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async () => {
    if (!newStatus) return;
    if (newStatus === "resolved" && !resolutionNotes.trim()) {
      toast.error("Catatan resolusi wajib diisi saat menandai Selesai");
      return;
    }
    setUpdatingStatus(true);
    try {
      await api.patch(`/api/v1/incidents/${id}/status`, {
        status: newStatus,
        resolution_notes: resolutionNotes || undefined,
      });
      toast.success("Status berhasil diperbarui");
      fetchData();
      setNewStatus("");
      setResolutionNotes("");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      toast.error(e.response?.data?.message ?? e.response?.data?.error ?? "Gagal memperbarui status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await api.post(`/api/v1/incidents/${id}/notes`, {
        note: newNote,
        is_internal: noteInternal,
      });
      setNotes((prev) => [res.data.data, ...prev]);
      setNewNote("");
      toast.success("Catatan ditambahkan");
    } catch {
      toast.error("Gagal menambahkan catatan");
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Memuat detail laporan...
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Laporan tidak ditemukan.
        <Button variant="link" onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" className="w-fit -ml-2" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Kembali ke Daftar
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-red-700 dark:text-red-400 flex items-center gap-2">
              <ShieldAlert className="h-6 w-6" />
              Detail Laporan Insiden
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-mono break-all">ID: {incident.id}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {getStatusBadge(incident.status)}
            {incident.severity && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${SEVERITY_COLORS[incident.severity] ?? ""}`}>
                {SEVERITY_LABELS[incident.severity]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metadata Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Laporan</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Jenis Insiden</p>
            <p className="font-medium capitalize">{incident.incident_type.replace(/_/g, " ")}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tanggal Kejadian</p>
            <p className="font-medium">{format(new Date(incident.incident_date), "dd MMMM yyyy")}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Lokasi</p>
            <p>{incident.location}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pelapor</p>
            {incident.is_anonymous ? (
              <span className="flex items-center text-muted-foreground gap-1 italic">
                <UserX className="h-3.5 w-3.5" /> Anonim
              </span>
            ) : (
              <div>
                <p className="font-medium">{incident.reporter?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{incident.reporter?.email}</p>
              </div>
            )}
          </div>
          {incident.involved_parties && (
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pihak Terlibat</p>
              <p>{incident.involved_parties}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Dilaporkan</p>
            <p>{format(new Date(incident.created_at), "dd MMM yyyy, HH:mm")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kronologi Kejadian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 p-4 rounded-md text-sm whitespace-pre-wrap leading-relaxed">
            {incident.description}
          </div>
        </CardContent>
      </Card>

      {/* Attachment */}
      {incident.attachment_path && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lampiran Bukti</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => window.open(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/incidents/${incident.id}/attachment`, "_blank")}
            >
              <Download className="h-4 w-4 mr-2" />
              Unduh Lampiran
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resolution Notes */}
      {incident.resolution_notes && (
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" /> Catatan Resolusi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-md text-sm whitespace-pre-wrap">
              {incident.resolution_notes}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin: Update Status */}
      {canManage && incident.status !== "resolved" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perbarui Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status Baru</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v ?? "")}>
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Pilih status..." />
                </SelectTrigger>
                <SelectContent>
                  {incident.status === "submitted" && (
                    <SelectItem value="investigating">Mulai Investigasi</SelectItem>
                  )}
                  {incident.status === "investigating" && (
                    <SelectItem value="resolved">Tandai Selesai</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {newStatus === "resolved" && (
              <div className="space-y-2">
                <Label>Catatan Resolusi <span className="text-red-500">*</span></Label>
                <Textarea
                  placeholder="Jelaskan tindakan yang sudah diambil untuk menyelesaikan insiden ini..."
                  className="min-h-[100px]"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                />
              </div>
            )}
            <Button
              onClick={handleUpdateStatus}
              disabled={!newStatus || updatingStatus}
              className="bg-blue-900 hover:bg-blue-800 text-white"
            >
              {updatingStatus ? "Menyimpan..." : "Simpan Perubahan Status"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Admin: Investigation Notes */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              Catatan Investigasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add note form */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
              <Label className="text-sm font-medium">Tambah Catatan</Label>
              <Textarea
                placeholder="Tulis catatan investigasi..."
                className="min-h-[80px]"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noteInternal}
                    onChange={(e) => setNoteInternal(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Catatan Internal (tidak terlihat pelapor)</span>
                </label>
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addingNote}
                >
                  {addingNote ? "Menyimpan..." : "Tambahkan"}
                </Button>
              </div>
            </div>

            {/* Notes list */}
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada catatan investigasi.</p>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{note.author?.name ?? "Admin"}</span>
                        {note.is_internal && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded">
                            <Lock className="h-3 w-3" /> Internal
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), "dd MMM yyyy, HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
