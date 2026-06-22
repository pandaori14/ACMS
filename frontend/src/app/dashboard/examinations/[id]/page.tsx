"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, ClipboardCheck, PlayCircle, Download } from "lucide-react";
import { toast } from "sonner";

export default function ExaminationDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExamDetail();
  }, [params.id]);

  const fetchExamDetail = async () => {
    try {
      const res = await api.get(`/api/v1/examinations/${params.id}`);
      setExam(res.data.data);
    } catch (err) {
      console.error("Failed to fetch exam detail", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    // We can open the URL directly or trigger a download
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/examinations/${params.id}/pdf`;
    
    // Create an invisible anchor tag to trigger the download
    const link = document.createElement('a');
    link.href = url;
    // We must pass the Authorization header, so a direct link might fail if sanctum is used for API token.
    // Since it's web route, let's just do a fetch and blob
    toast.loading("Membuat PDF Berita Acara...", { id: 'pdf-download' });
    api.get(`/api/v1/examinations/${params.id}/pdf`, { responseType: 'blob' })
      .then((response) => {
        const _url = window.URL.createObjectURL(new Blob([response.data]));
        const _link = document.createElement('a');
        _link.href = _url;
        _link.setAttribute('download', `Berita_Acara_Ujian_${exam.name.replace(/\s+/g, '_')}.pdf`);
        document.body.appendChild(_link);
        _link.click();
        _link.parentNode?.removeChild(_link);
        toast.success("PDF berhasil diunduh!", { id: 'pdf-download' });
      })
      .catch((error) => {
        console.error("PDF download failed", error);
        toast.error("Gagal mengunduh PDF.", { id: 'pdf-download' });
      });
  };

  if (loading) {
    return <div className="p-6"><Skeleton className="h-12 w-64 mb-4" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!exam) {
    return <div className="p-6 text-center text-red-500">Ujian tidak ditemukan.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">{exam.name}</h1>
            <Badge variant={exam.type === "OSCE" ? "default" : "secondary"}>{exam.type}</Badge>
            <Badge variant="outline">{exam.status}</Badge>
          </div>
          <p className="text-muted-foreground">
            Stase: {exam.stase?.name} • Tanggal: {new Date(exam.date).toLocaleDateString("id-ID")}
          </p>
        </div>
        
        {exam.status !== "COMPLETED" && exam.type === "OSCE" && (
          <Button onClick={() => router.push(`/dashboard/examinations/${exam.id}/assess`)} className="gap-2">
            <PlayCircle className="h-4 w-4" /> Mulai Penilaian
          </Button>
        )}
        
        {exam.status === "COMPLETED" && (
          <Button variant="outline" onClick={handleDownloadPdf} className="gap-2 text-primary border-primary hover:bg-primary/5">
            <Download className="h-4 w-4" /> Unduh Berita Acara
          </Button>
        )}

        {exam.type === "CBT" && (
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => toast.success("Menuju halaman ujian Moodle...")}>
                    Buka Ujian di Moodle
                </Button>
                <div className="relative">
                    <input 
                        type="file" 
                        accept=".csv" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        title="Upload CSV Moodle"
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                toast.success("Berhasil mensimulasikan import nilai dari " + e.target.files[0].name);
                                // In future: upload this file to backend to map final_score
                            }
                        }}
                    />
                    <Button className="gap-2">
                        <ClipboardCheck className="h-4 w-4" /> Import Nilai (CSV Moodle)
                    </Button>
                </div>
            </div>
        )}
      </div>

      <Tabs defaultValue="participants" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="participants">Peserta ({exam.participants?.length || 0})</TabsTrigger>
          <TabsTrigger value="stations">Stasiun OSCE ({exam.stations?.length || 0})</TabsTrigger>
          <TabsTrigger value="assessors">Penguji ({exam.assessors?.length || 0})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="participants">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Daftar Peserta Ujian</CardTitle>
                  <CardDescription>Mahasiswa yang akan mengikuti ujian ini.</CardDescription>
                </div>
                <Button variant="outline" size="sm">Tambah Peserta</Button>
              </div>
            </CardHeader>
            <CardContent>
              {exam.participants?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">Belum ada peserta terdaftar.</div>
              ) : (
                <div className="space-y-4">
                  {exam.participants?.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{p.student?.name}</p>
                          <p className="text-sm text-muted-foreground">{p.student?.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={p.status === "REGISTERED" ? "secondary" : "default"}>{p.status}</Badge>
                        {p.final_score !== null && (
                          <div className="mt-1 font-bold text-lg text-primary">{p.final_score}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stations">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Stasiun Ujian (Khusus OSCE)</CardTitle>
                  <CardDescription>Manajemen rubrik atau stasiun ujian klinis objektif terstruktur.</CardDescription>
                </div>
                <Button variant="outline" size="sm">Tambah Stasiun</Button>
              </div>
            </CardHeader>
            <CardContent>
              {exam.stations?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">Belum ada stasiun yang dibuat.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {exam.stations?.map((s: any) => (
                    <Card key={s.id} className="border bg-slate-50/50 dark:bg-slate-900/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex justify-between">
                          <span>Stasiun {s.order}: {s.name}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{s.description || "Tidak ada deskripsi/rubrik."}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessors">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Daftar Penguji</CardTitle>
                  <CardDescription>Dodiknis atau Dosen yang bertugas memberikan penilaian.</CardDescription>
                </div>
                <Button variant="outline" size="sm">Tugaskan Penguji</Button>
              </div>
            </CardHeader>
            <CardContent>
              {exam.assessors?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">Belum ada penguji ditugaskan.</div>
              ) : (
                <div className="space-y-4">
                  {exam.assessors?.map((a: any) => (
                    <div key={a.id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="bg-green-100 p-2 rounded-full dark:bg-green-900/30">
                          <ClipboardCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium">{a.assessor?.name}</p>
                          <p className="text-sm text-muted-foreground">Stasiun: {a.exam_station?.name || "Semua (CBT)"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
