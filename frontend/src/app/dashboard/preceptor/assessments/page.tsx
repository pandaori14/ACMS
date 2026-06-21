"use client";

import { useState } from "react";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import api from "@/lib/api";
import { Stethoscope, CheckCircle, Search, User } from "lucide-react";

export default function PreceptorAssessmentsPage() {
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [assessmentType, setAssessmentType] = useState<"mini-cex" | "dops">("mini-cex");

  // Dummy students array for demonstration
  const [students] = useState([
    { id: "std-1", name: "Budi Santoso", stase: "Ilmu Penyakit Dalam" },
    { id: "std-2", name: "Siti Aminah", stase: "Ilmu Kesehatan Anak" },
  ]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error("Pilih mahasiswa terlebih dahulu");
      return;
    }

    try {
      setLoading(true);
      // Construct form data
      const formData = new FormData(e.currentTarget);
      const payload = {
        student_id: selectedStudent,
        assessment_type: assessmentType,
        score: parseInt(formData.get("score") as string),
        notes: formData.get("notes"),
        date: new Date().toISOString().split('T')[0]
      };

      // Mock API post for creating clinical assessment
      // await api.post("/assessments/clinical", payload);
      
      setTimeout(() => {
        toast.success("Penilaian berhasil disimpan!");
        setLoading(false);
        (e.target as HTMLFormElement).reset();
        setSelectedStudent(null);
      }, 1000);

    } catch (error) {
      toast.error("Gagal menyimpan penilaian");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ujian Klinis (Assessment)</h1>
        <p className="text-muted-foreground mt-2">
          Lakukan pengujian akhir stase (Mini-CEX, DOPS, CBD) untuk mahasiswa bimbingan Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kolom Kiri: Pilih Mahasiswa */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Pilih Mahasiswa</CardTitle>
            <CardDescription>Cari mahasiswa aktif</CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nama..." className="pl-8" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {students.map((std) => (
              <div 
                key={std.id}
                onClick={() => setSelectedStudent(std.id)}
                className={`p-3 border rounded-lg cursor-pointer transition-colors flex items-start space-x-3 ${
                  selectedStudent === std.id 
                    ? "border-primary bg-primary/5" 
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full">
                  <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <p className="font-medium text-sm">{std.name}</p>
                  <p className="text-xs text-muted-foreground">{std.stase}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Kolom Kanan: Form Penilaian */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Formulir Penilaian</CardTitle>
            <CardDescription>
              {selectedStudent 
                ? `Menguji: ${students.find(s => s.id === selectedStudent)?.name}` 
                : "Silakan pilih mahasiswa dari daftar di sebelah kiri."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedStudent ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-gray-50/50 dark:bg-gray-900/20">
                <Stethoscope className="h-12 w-12 text-gray-300 mb-4" />
                <p className="font-medium text-gray-500">Belum ada mahasiswa yang dipilih</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipe Ujian</Label>
                    <div className="flex space-x-2">
                      <Button 
                        type="button" 
                        variant={assessmentType === "mini-cex" ? "default" : "outline"}
                        onClick={() => setAssessmentType("mini-cex")}
                        className="w-full"
                      >
                        Mini-CEX
                      </Button>
                      <Button 
                        type="button" 
                        variant={assessmentType === "dops" ? "default" : "outline"}
                        onClick={() => setAssessmentType("dops")}
                        className="w-full"
                      >
                        DOPS
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="score">Nilai Keseluruhan (0 - 100)</Label>
                    <Input 
                      id="score" 
                      name="score" 
                      type="number" 
                      min="0" 
                      max="100" 
                      placeholder="Misal: 85" 
                      required 
                      className="text-lg font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2 border rounded-lg p-4 bg-gray-50 dark:bg-gray-900/30">
                  <h4 className="text-sm font-semibold mb-4">Rubrik Penilaian Terstandarisasi</h4>
                  {assessmentType === "mini-cex" ? (
                    <div className="space-y-3">
                      {["Anamnesis", "Pemeriksaan Fisik", "Klinis (Clinical Judgment)", "Keterampilan Komunikasi"].map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <Label className="text-sm font-normal">{item}</Label>
                          <select className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-950">
                            <option>Memuaskan (S)</option>
                            <option>Kurang (N)</option>
                            <option>Batas (B)</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {["Persiapan Alat", "Teknik Prosedural", "Asepsis", "Kenyamanan Pasien"].map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <Label className="text-sm font-normal">{item}</Label>
                          <select className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-950">
                            <option>Memuaskan (S)</option>
                            <option>Kurang (N)</option>
                            <option>Batas (B)</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan & Umpan Balik (Feedback)</Label>
                  <Textarea 
                    id="notes" 
                    name="notes" 
                    placeholder="Berikan masukan konstruktif untuk mahasiswa..." 
                    rows={4} 
                    required 
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" className="w-full md:w-auto" disabled={loading}>
                    {loading ? "Menyimpan..." : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Simpan Hasil Ujian
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
