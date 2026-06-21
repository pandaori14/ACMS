"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, CheckCircle, Send, Calculator } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";


export default function GradeManagementPage() {
  const [grades, setGrades] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  
  const fetchGrades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/grades");
      setGrades(res.data.data || res.data);
    } catch (err) {
      console.error("Failed to load grades", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/rotation/assignments");
      setAssignments(res.data.data || res.data);
    } catch (err) {
      console.error("Failed to load assignments", err);
    }
  }, []);

  useEffect(() => {
    fetchGrades();
    fetchAssignments();
  }, [fetchGrades, fetchAssignments]);

  const handleCalculate = async () => {
    if (!selectedAssignment) return;
    setCalculating(true);
    try {
      await api.post(`/api/v1/grades/calculate/${selectedAssignment}`);
      fetchGrades();
      setSelectedAssignment("");
    } catch (err) {
      console.error("Calculation failed", err);
    } finally {
      setCalculating(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/api/v1/grades/${id}/approve`);
      fetchGrades();
    } catch (err) {
      console.error("Approval failed", err);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await api.patch(`/api/v1/grades/${id}/publish`);
      fetchGrades();
    } catch (err) {
      console.error("Publishing failed", err);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get("/api/v1/grades/export", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Export_SIAKAD_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">Draf / Menunggu Approve</span>;
      case "approved":
        return <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Disetujui</span>;
      case "published":
        return <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Dipublikasi</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Rekapitulasi Nilai Stase</h1>
          <p className="text-muted-foreground mt-1">
            Kalkulasi, setujui, dan publikasi nilai akhir rotasi klinis mahasiswa.
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Download className="h-4 w-4" />
          Export ke SIAKAD
        </Button>
      </div>

      <div className="bg-card p-6 rounded-xl border shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-2">
          <Label>Kalkulasi Nilai Penugasan Stase</Label>
          <Select value={selectedAssignment} onValueChange={(v) => setSelectedAssignment(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih mahasiswa & stase untuk dikalkulasi nilainya..." />
            </SelectTrigger>
            <SelectContent>
              {assignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.student?.name} — {a.stase?.name} {a.rotation_period ? `(Tgl: ${new Date(a.rotation_period.start_date).toLocaleDateString()} - ${new Date(a.rotation_period.end_date).toLocaleDateString()})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={handleCalculate} 
          disabled={!selectedAssignment || calculating}
          className="gap-2 w-full md:w-auto"
        >
          {calculating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
          Jalankan Kalkulasi
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mahasiswa</TableHead>
              <TableHead>Stase</TableHead>
              <TableHead>Rincian Skor (L/M/D/C)</TableHead>
              <TableHead>Nilai Akhir</TableHead>
              <TableHead>Huruf</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grades.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Belum ada nilai yang dikalkulasi.
                </TableCell>
              </TableRow>
            ) : (
              grades.map((grade) => (
                <TableRow key={grade.id}>
                  <TableCell className="font-medium">{grade.student?.name}</TableCell>
                  <TableCell>{grade.rotation_assignment?.stase?.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>L: {grade.logbook_score}</div>
                    <div>M: {grade.minicex_score}</div>
                    <div>D: {grade.dops_score}</div>
                    <div>C: {grade.cbd_score}</div>
                  </TableCell>
                  <TableCell className="font-bold text-lg">{grade.final_score}</TableCell>
                  <TableCell>
                    <span className="font-bold px-2 py-1 bg-gray-100 rounded text-blue-800">
                      {grade.letter_grade}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(grade.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {grade.status === "draft" && (
                        <Button variant="outline" size="sm" onClick={() => handleApprove(grade.id)} className="gap-1 text-blue-600">
                          <CheckCircle className="h-3 w-3" /> Approve
                        </Button>
                      )}
                      {grade.status === "approved" && (
                        <Button variant="default" size="sm" onClick={() => handlePublish(grade.id)} className="gap-1">
                          <Send className="h-3 w-3" /> Publish
                        </Button>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/export/transcript/${grade.student_id}`, '_blank')} className="gap-1">
                        <Download className="h-3 w-3" /> PDF
                      </Button>
                    </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
