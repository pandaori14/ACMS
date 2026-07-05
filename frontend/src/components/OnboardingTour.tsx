"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  BookOpen,
  CalendarSync,
  GraduationCap,
  LifeBuoy,
  CheckCircle,
  ClipboardList,
  FileText,
  Users,
  BarChart2,
  Settings,
  type LucideIcon,
} from "lucide-react";

const TOUR_KEY = "acms_tour_v2";

interface TourStep {
  icon: LucideIcon;
  title: string;
  description: string;
  url?: string;
}

/** Langkah tur per peran — statik, tanpa dependency library tour. */
function stepsForRole(role: string): TourStep[] {
  if (role === "Mahasiswa") {
    return [
      { icon: MapPin, title: "Presensi Harian", description: "Check-in saat tiba di RS dan check-out saat pulang — aktifkan GPS. Izin/sakit juga diajukan dari halaman yang sama.", url: "/dashboard/clinical/attendance" },
      { icon: BookOpen, title: "Logbook Klinis", description: "Catat kegiatan klinis harian Anda, pilih target kompetensi, lalu submit agar diverifikasi pembimbing.", url: "/dashboard/clinical/logbook" },
      { icon: CalendarSync, title: "Jadwal Rotasi", description: "Lihat stase dan rumah sakit penempatan Anda selama pendidikan di menu Jadwal Rotasi.", url: "/dashboard/rotations/schedule" },
      { icon: GraduationCap, title: "Nilai & Transkrip", description: "Nilai tiap stase terbit di Transkrip Klinis; dokumen resmi ber-QR tersedia di Dokumen Resmi.", url: "/dashboard/grades" },
      { icon: LifeBuoy, title: "Butuh Bantuan?", description: "Panduan lengkap penggunaan sistem selalu tersedia di menu Pusat Bantuan.", url: "/dashboard/help" },
    ];
  }
  if (role === "Dodiknis") {
    return [
      { icon: CheckCircle, title: "Verifikasi Logbook", description: "Tinjau logbook mahasiswa bimbingan Anda — verifikasi per entri atau centang beberapa untuk verifikasi massal.", url: "/dashboard/clinical/verification" },
      { icon: ClipboardList, title: "Penilaian Klinis", description: "Isi Mini-CEX, DOPS, dan CBD untuk mahasiswa di RS Anda dari menu Isi Penilaian.", url: "/dashboard/assessments" },
      { icon: FileText, title: "Honorarium", description: "Riwayat pembayaran insentif preceptor Anda tercatat di menu Honorarium Saya.", url: "/dashboard/finance/preceptors" },
      { icon: LifeBuoy, title: "Butuh Bantuan?", description: "Panduan lengkap untuk preceptor tersedia di menu Pusat Bantuan.", url: "/dashboard/help" },
    ];
  }
  if (["Super Admin", "Admin Prodi", "Kaprodi", "Admin RS"].includes(role)) {
    return [
      { icon: Users, title: "Data Master", description: "Kelola prodi, stase, angkatan, mahasiswa (import Excel), dan rumah sakit beserta kuotanya.", url: "/dashboard/academic/students" },
      { icon: CalendarSync, title: "Rotasi Klinik", description: "Buat periode rotasi lalu gunakan penjadwalan otomatis atau penempatan manual — kuota dijaga sistem.", url: "/dashboard/rotations" },
      { icon: BarChart2, title: "Laporan & Analitik", description: "Semua unduhan Excel/PDF ada di Pusat Laporan; KPI strategis di Dashboard Eksekutif.", url: "/dashboard/reports" },
      { icon: Settings, title: "Pengaturan Sistem", description: "SMTP, matrix notifikasi, referensi dropdown, RBAC, dan konten bantuan dikelola dari Settings.", url: "/dashboard/settings" },
      { icon: LifeBuoy, title: "Butuh Bantuan?", description: "Panduan admin lengkap tersedia di menu Pusat Bantuan.", url: "/dashboard/help" },
    ];
  }
  // Fallback umum (Dosen, Finance, dll)
  return [
    { icon: BarChart2, title: "Dashboard", description: "Ringkasan data sesuai peran Anda tampil di halaman Dashboard.", url: "/dashboard" },
    { icon: FileText, title: "Menu Sesuai Peran", description: "Sidebar hanya menampilkan menu yang menjadi hak akses Anda.", url: undefined },
    { icon: LifeBuoy, title: "Butuh Bantuan?", description: "Panduan penggunaan sistem tersedia di menu Pusat Bantuan.", url: "/dashboard/help" },
  ];
}

/**
 * Tur orientasi pertama-login: muncul sekali per peran per perangkat
 * (localStorage), carousel langkah statik. Tanpa dependency baru.
 */
export function OnboardingTour() {
  const user = useAuthStore((state) => state.user);
  const role = user?.roles?.[0] || "";
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!role) return;
    try {
      if (localStorage.getItem(TOUR_KEY) !== role) {
        setOpen(true);
      }
    } catch {
      // localStorage tidak tersedia (private mode ketat) — lewati tur
    }
  }, [role]);

  if (!role || !open) return null;

  const steps = stepsForRole(role);
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const Icon = current.icon;

  const finish = (navigateTo?: string) => {
    try {
      localStorage.setItem(TOUR_KEY, role);
    } catch {
      // abaikan
    }
    setOpen(false);
    if (navigateTo) router.push(navigateTo);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && finish()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 h-14 w-14 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300">
            <Icon className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center">{current.title}</DialogTitle>
          <DialogDescription className="text-center">
            {current.description}
          </DialogDescription>
        </DialogHeader>

        {/* Indikator langkah */}
        <div className="flex justify-center gap-1.5 py-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-blue-700 dark:bg-blue-400" : "w-1.5 bg-slate-300 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => finish()}>
            Lewati
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                Kembali
              </Button>
            )}
            {isLast ? (
              <Button size="sm" className="bg-blue-900 hover:bg-blue-800" onClick={() => finish(current.url)}>
                Selesai
              </Button>
            ) : (
              <Button size="sm" className="bg-blue-900 hover:bg-blue-800" onClick={() => setStep(step + 1)}>
                Lanjut
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
