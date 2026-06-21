"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, ArrowLeft, Download } from "lucide-react";
import Image from "next/image";

export default function TranscriptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const { data: transcript, isLoading } = useQuery({
    queryKey: ["transcript", studentId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/grades/transcript/${studentId}`);
      return res.data;
    }
  });

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownloadPdf = async () => {
    try {
      // The API returns a PDF blob
      const res = await api.get(`/api/v1/export/transcript/${studentId}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Transkrip_Klinis_${studentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error("Failed to download PDF", error);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!transcript) {
    return <div className="p-8 text-center text-red-500">Transkrip tidak ditemukan atau Anda tidak memiliki akses.</div>;
  }

  const { student, grades, summary } = transcript;

  return (
    <div className="max-w-4xl mx-auto pb-12 print:max-w-none print:pb-0">
      {/* Action Buttons (Hidden on Print) */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button variant="ghost" onClick={() => router.back()} className="-ml-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPdf} className="gap-2">
            <Download className="h-4 w-4" /> Unduh PDF
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Cetak Transkrip
          </Button>
        </div>
      </div>

      {/* A4 Paper Container for Web View, but resets on Print */}
      <div className="bg-white text-black p-8 sm:p-12 shadow-sm border rounded-xl print:shadow-none print:border-none print:rounded-none print:p-0">
        
        {/* KOP Surat */}
        <div className="border-b-4 border-double border-black pb-4 mb-6 text-center">
          <div className="flex justify-center items-center gap-6 mb-2">
            {/* Fallback to simple icon/text if no logo is available */}
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center shrink-0 print:border print:border-gray-400">
               <span className="font-bold text-gray-500">LOGO</span>
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase">Universitas Kedokteran Nusantara</h2>
              <h1 className="text-2xl font-extrabold uppercase mt-1">Fakultas Kedokteran</h1>
              <p className="text-sm">Jl. Pendidikan Dokter No. 1, Jakarta 12345, Indonesia</p>
              <p className="text-xs">Telp: (021) 1234567 | Email: info@fk-ukn.ac.id | Web: fk.ukn.ac.id</p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold underline uppercase tracking-wider">Transkrip Akademik Profesi Dokter</h2>
        </div>

        {/* Biodata */}
        <div className="mb-8 max-w-2xl">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 w-1/3 font-semibold">Nama Lengkap</td>
                <td className="py-1 w-4">:</td>
                <td className="py-1">{student.name}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">NIM (Nomor Induk Mahasiswa)</td>
                <td className="py-1">:</td>
                <td className="py-1">{student.nim}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">Program Studi</td>
                <td className="py-1">:</td>
                <td className="py-1">{student.program}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">Angkatan / Cohort</td>
                <td className="py-1">:</td>
                <td className="py-1">{student.cohort}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Grades Table */}
        <div className="mb-8">
          <table className="w-full border-collapse border border-black text-sm">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-100">
                <th className="border border-black px-4 py-2 text-center w-12">No</th>
                <th className="border border-black px-4 py-2 text-left">Nama Bagian / Stase Klinis</th>
                <th className="border border-black px-4 py-2 text-center w-24">Durasi (Mgg)</th>
                <th className="border border-black px-4 py-2 text-center w-24">Nilai Angka</th>
                <th className="border border-black px-4 py-2 text-center w-24">Huruf Mutu</th>
              </tr>
            </thead>
            <tbody>
              {grades.length > 0 ? (
                grades.map((grade: any, index: number) => (
                  <tr key={grade.id}>
                    <td className="border border-black px-4 py-2 text-center">{index + 1}</td>
                    <td className="border border-black px-4 py-2 font-medium">{grade.rotation_assignment?.stase?.name || "-"}</td>
                    <td className="border border-black px-4 py-2 text-center">{grade.rotation_assignment?.stase?.duration_weeks || 1}</td>
                    <td className="border border-black px-4 py-2 text-center font-bold">{Number(grade.final_score).toFixed(2)}</td>
                    <td className="border border-black px-4 py-2 text-center font-bold">{grade.letter_grade || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="border border-black px-4 py-8 text-center italic text-gray-500">
                    Belum ada nilai stase yang dipublikasikan.
                  </td>
                </tr>
              )}
            </tbody>
            {grades.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 print:bg-gray-50 font-bold">
                  <td colSpan={3} className="border border-black px-4 py-3 text-right uppercase">Rata-rata Nilai</td>
                  <td className="border border-black px-4 py-3 text-center">{summary.average_score}</td>
                  <td className="border border-black px-4 py-3 text-center"></td>
                </tr>
                <tr className="bg-gray-100 print:bg-gray-100 font-bold">
                  <td colSpan={3} className="border border-black px-4 py-3 text-right uppercase">Indeks Prestasi Kumulatif (IPK) Profesi</td>
                  <td colSpan={2} className="border border-black px-4 py-3 text-center text-lg">{summary.ipk}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Signature Area */}
        <div className="flex justify-end mt-16 text-sm">
          <div className="w-64 text-center">
            <p className="mb-1">Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold">Ketua Program Studi Profesi Dokter</p>
            <div className="h-24"></div> {/* Signature Space */}
            <p className="font-bold underline">Prof. Dr. Budi Santoso, dr., Sp.PD, K-GEH</p>
            <p>NIP. 19700101 200003 1 001</p>
          </div>
        </div>

      </div>
    </div>
  );
}
