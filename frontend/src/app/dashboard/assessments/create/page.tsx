"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { Save, Send, FileSignature } from "lucide-react";

export default function CreateAssessmentPage() {
  const router = useRouter();
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    rotation_assignment_id: "",
    assessment_template_id: "",
    student_id: "",
    assessment_date: new Date().toISOString().split("T")[0],
    feedback_notes: "",
  });
  
  const [scores, setScores] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [tplRes, assignRes] = await Promise.all([
        api.get("/api/v1/assessments/templates"),
        api.get("/api/v1/rotation/assignments"), // In a real app, you'd filter by assignments under this preceptor
      ]);
      setTemplates(tplRes.data.data);
      setAssignments(assignRes.data.data);
    } catch (err) {
      console.error("Failed to load reference data", err);
    }
  }, []);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  const selectedTemplate = templates.find((t) => t.id === formData.assessment_template_id);
  const selectedAssignment = assignments.find((a) => a.id === formData.rotation_assignment_id);

  // Automatically update student_id when assignment changes
  useEffect(() => {
    if (selectedAssignment) {
      setFormData((prev) => ({ ...prev, student_id: selectedAssignment.student?.id || selectedAssignment.student_id }));
    }
  }, [selectedAssignment]);

  const handleScoreChange = (key: string, value: string) => {
    const num = parseFloat(value);
    setScores((prev) => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
  };

  const handleSubmit = async (status: "draft" | "submitted") => {
    setError(null);
    if (!formData.rotation_assignment_id || !formData.assessment_template_id || !formData.assessment_date) {
      setError("Mohon lengkapi penugasan, template, dan tanggal penilaian.");
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post("/api/v1/assessments", {
        ...formData,
        status,
        scores,
      });
      router.push("/dashboard/assessments");
    } catch (err) {
      setError(getApiErrorMessage(err, "Gagal menyimpan penilaian."));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotal = () => {
    return Object.values(scores).reduce((sum, score) => sum + (score || 0), 0);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileSignature className="h-8 w-8 text-blue-600" />
          Formulir Penilaian Klinis
        </h1>
        <p className="text-muted-foreground mt-2">
          Pilih mahasiswa dan instrumen penilaian untuk mulai mengisi evaluasi.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-card p-6 rounded-xl border shadow-sm">
        <div className="space-y-2">
          <Label>Penugasan Mahasiswa</Label>
          <Select
            value={formData.rotation_assignment_id}
            onValueChange={(val) => setFormData({ ...formData, rotation_assignment_id: val ?? "" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih mahasiswa..." />
            </SelectTrigger>
            <SelectContent>
              {assignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.student?.name || "Tanpa Nama"} — {a.stase?.name || "Tanpa Stase"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tanggal Penilaian</Label>
          <Input
            type="date"
            value={formData.assessment_date}
            onChange={(e) => setFormData({ ...formData, assessment_date: e.target.value })}
            max={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Instrumen Penilaian</Label>
          <Select
            value={formData.assessment_template_id}
            onValueChange={(val) => {
              setFormData({ ...formData, assessment_template_id: val ?? "" });
              setScores({}); // Reset scores on template change
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih instrumen (Mini-CEX, DOPS, CBD)..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedTemplate && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-blue-50/50 px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-blue-900">{selectedTemplate.name}</h2>
              <p className="text-sm text-blue-700 mt-1">Isi skor untuk setiap indikator yang diukur.</p>
            </div>
            <div className="p-6 space-y-6">
              {selectedTemplate.rubric_schema?.indicators?.map((indicator: any) => (
                <div key={indicator.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <Label className="text-base font-medium">{indicator.label}</Label>
                    <p className="text-xs text-muted-foreground mt-1">Skor maksimal: {indicator.max_score}</p>
                  </div>
                  <div className="w-32">
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max={indicator.max_score}
                        step="0.5"
                        placeholder="0"
                        value={scores[indicator.key] === undefined ? "" : scores[indicator.key]}
                        onChange={(e) => handleScoreChange(indicator.key, e.target.value)}
                        className="pr-12 text-right font-medium"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                        / {indicator.max_score}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="bg-muted/30 p-4 rounded-lg flex justify-between items-center mt-6">
                <span className="font-semibold text-lg">Total Skor</span>
                <span className="text-2xl font-bold text-blue-600">
                  {calculateTotal()}{" "}
                  <span className="text-sm text-muted-foreground font-normal">
                    /{" "}
                    {selectedTemplate.rubric_schema?.indicators?.reduce(
                      (sum: number, ind: any) => sum + (ind.max_score || 0),
                      0
                    )}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border shadow-sm space-y-3">
            <Label className="text-lg">Umpan Balik (Feedback)</Label>
            <p className="text-sm text-muted-foreground">Berikan evaluasi kualitatif dan saran perbaikan untuk mahasiswa.</p>
            <textarea
              className="flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Tuliskan umpan balik Anda di sini..."
              value={formData.feedback_notes}
              onChange={(e) => setFormData({ ...formData, feedback_notes: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-4 pb-12">
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => handleSubmit("draft")}
              disabled={submitting}
            >
              <Save className="h-5 w-5" />
              Simpan Draf
            </Button>
            <Button
              size="lg"
              className="gap-2 bg-blue-600 hover:bg-blue-700"
              onClick={() => handleSubmit("submitted")}
              disabled={submitting}
            >
              <Send className="h-5 w-5" />
              Submit Penilaian
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
