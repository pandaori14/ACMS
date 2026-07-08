"use client";

import Link from "next/link";
import {
  ArrowRight, Activity, ShieldCheck,
  Stethoscope, Clock,
  Wallet, BookOpen, CheckCircle2, Hospital,
  Lock, ChevronRight,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { AppSetting } from "@/lib/api-helpers";
import LandingFooter from "@/components/landing/LandingFooter";
import { jakarta } from "@/lib/fonts";
import Reveal from "@/components/landing/Reveal";
import "@/app/landing.css";

/* ----------------------------------------------------------------
   Types
   ---------------------------------------------------------------- */
interface LandingConfig {
  title: string;
  badge: string;
  description: string;
  appName: string;
  appLogo: string;
  ctaText: string;
  ctaLink: string;
  showStats: string;
  showAnnouncement: string;
  announcementText: string;
  heroImage: string;
}

interface PublicStats {
  hospitals: number;
  logbook_entries: number;
  students: number;
  programs: number;
}

/* ----------------------------------------------------------------
   Sub-components
   ---------------------------------------------------------------- */

/** Animated number that counts up on mount */
function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value <= 0) return;
    const duration = 1600; // ms
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), value);
      setDisplay(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className="landing-stat-value">
      {display.toLocaleString("id-ID")}{suffix}
    </span>
  );
}

/** Abstract UI mockup — dashboard preview built with CSS */
function DashboardMockup({ className = "" }: { className?: string }) {
  return (
    <div className={`landing-feature-visual p-5 ${className}`}>
      {/* Title bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-red-300/60" />
        <div className="w-3 h-3 rounded-full bg-yellow-300/60" />
        <div className="w-3 h-3 rounded-full bg-green-300/60" />
        <div className="landing-mock-bar flex-1 ml-4" style={{ height: 8 }} />
      </div>
      {/* Sidebar + content area */}
      <div className="flex gap-3 h-[calc(100%-2rem)]">
        {/* Sidebar */}
        <div className="w-[28%] flex flex-col gap-2 py-2">
          <div className="landing-mock-bar landing-mock-bar--accent w-full" style={{ height: 8 }} />
          <div className="landing-mock-bar w-[85%]" style={{ height: 8 }} />
          <div className="landing-mock-bar w-[70%]" style={{ height: 8 }} />
          <div className="landing-mock-bar w-[90%]" style={{ height: 8 }} />
          <div className="landing-mock-bar landing-mock-bar--gold w-[60%] mt-auto" style={{ height: 8 }} />
        </div>
        {/* Main content */}
        <div className="flex-1 bg-white rounded-xl p-3 border border-slate-100 flex flex-col gap-3">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-50 rounded-lg p-2 flex flex-col gap-1.5">
                <div className="landing-mock-bar w-[40%]" style={{ height: 6 }} />
                <div className={`landing-mock-bar ${i === 1 ? "landing-mock-bar--accent" : i === 2 ? "landing-mock-bar--gold" : ""} w-[65%]`} style={{ height: 12 }} />
              </div>
            ))}
          </div>
          {/* Table rows */}
          <div className="flex-1 flex flex-col gap-1.5 mt-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-2 items-center">
                <div className="w-5 h-5 rounded bg-slate-100 flex-shrink-0" />
                <div className="landing-mock-bar flex-1" style={{ height: 8 }} />
                <div className={`landing-mock-bar ${i % 2 === 0 ? "landing-mock-bar--accent" : ""} w-[15%]`} style={{ height: 8 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Abstract schedule/rotation visual */
function RotationMockup({ className = "" }: { className?: string }) {
  return (
    <div className={`landing-feature-visual p-5 ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="landing-mock-bar landing-mock-bar--accent w-[30%]" style={{ height: 10 }} />
        <div className="ml-auto landing-mock-bar landing-mock-bar--gold w-[15%]" style={{ height: 8 }} />
      </div>
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={`h-${i}`} className="landing-mock-bar" style={{ height: 6 }} />
        ))}
        {Array.from({ length: 28 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-md aspect-square flex items-center justify-center ${
              [4, 5, 11, 12, 18, 19, 25, 26].includes(i)
                ? "bg-slate-50"
                : [8, 9, 10].includes(i)
                ? "bg-blue-900/[0.06] border border-blue-900/10"
                : [15, 16, 17].includes(i)
                ? "bg-yellow-400/[0.08] border border-yellow-400/15"
                : "bg-white border border-slate-100"
            }`}
          >
            {i === 9 && <div className="w-1.5 h-1.5 rounded-full bg-blue-900/30" />}
            {i === 16 && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/40" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Abstract logbook visual */
function LogbookMockup({ className = "" }: { className?: string }) {
  return (
    <div className={`landing-feature-visual p-5 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="landing-mock-bar landing-mock-bar--accent w-[25%]" style={{ height: 10 }} />
        <div className="ml-auto flex gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-blue-900/[0.06] border border-blue-900/10" />
          <div className="w-7 h-7 rounded-lg bg-slate-100" />
        </div>
      </div>
      {/* Logbook entries */}
      {[1, 2, 3].map(i => (
        <div key={i} className="border border-slate-100 rounded-xl p-3 mb-2.5 last:mb-0 bg-white">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-slate-100" />
            <div className="landing-mock-bar flex-1" style={{ height: 8 }} />
            <div className={`px-2 py-0.5 rounded-md text-[9px] font-semibold ${
              i === 1 ? "bg-green-50 text-green-600" : i === 2 ? "bg-yellow-50 text-yellow-600" : "bg-slate-50 text-slate-400"
            }`}>
              {i === 1 ? "Verified" : i === 2 ? "Pending" : "Draft"}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="landing-mock-bar flex-1" style={{ height: 6 }} />
            <div className="landing-mock-bar w-[25%]" style={{ height: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Abstract assessment/grading visual */
function AssessmentMockup({ className = "" }: { className?: string }) {
  return (
    <div className={`landing-feature-visual p-5 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="landing-mock-bar landing-mock-bar--accent w-[28%]" style={{ height: 10 }} />
      </div>
      {/* Score gauge */}
      <div className="flex items-end gap-1.5 mb-4 h-16">
        {[35, 55, 70, 85, 60, 90, 45, 75, 80, 65, 50, 72].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md transition-all"
            style={{
              height: `${h}%`,
              background: h >= 75 ? "hsla(222, 47%, 40%, 0.15)" : h >= 50 ? "hsla(45, 93%, 47%, 0.15)" : "hsl(214, 32%, 92%)",
            }}
          />
        ))}
      </div>
      {/* Score rows */}
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-2 py-2 border-t border-slate-100">
          <div className="landing-mock-bar flex-1" style={{ height: 7 }} />
          <div className={`landing-mock-bar w-[12%] ${i === 1 ? "landing-mock-bar--accent" : ""}`} style={{ height: 7 }} />
          <div className="landing-mock-bar landing-mock-bar--gold w-[8%]" style={{ height: 7 }} />
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------
   Main Component
   ---------------------------------------------------------------- */
export default function AcmsLandingPage() {
  const [mounted, setMounted] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);

  const [config, setConfig] = useState<LandingConfig>({
    title: "Standar Profesionalisme\nKlinis Medis.",
    badge: "Layanan Resmi Pendidikan Profesi",
    description: "Sistem manajemen terintegrasi untuk Academic Clinical Management System. Akurat, objektif, dan dikelola oleh tenaga ahli profesional.",
    appName: "ACMS",
    appLogo: "",
    ctaText: "Masuk Portal",
    ctaLink: "/login",
    showStats: "true",
    showAnnouncement: "false",
    announcementText: "",
    heroImage: "",
  });

  const [stats, setStats] = useState<PublicStats | null>(null);

  /* --- Data fetching --- */
  useEffect(() => {
    setMounted(true);

    api.get("/api/public-settings").then((res) => {
      const data = res.data;
      const getVal = (key: string) => data.find((s: AppSetting) => s.key === key)?.value;

      setConfig(prev => ({
        title: getVal("landing_title") || prev.title,
        badge: getVal("landing_hero_badge") || prev.badge,
        description: getVal("landing_description") || prev.description,
        appName: getVal("app_name") || prev.appName,
        appLogo: getVal("app_logo") || prev.appLogo,
        ctaText: getVal("landing_cta_text") || prev.ctaText,
        ctaLink: getVal("landing_cta_link") || prev.ctaLink,
        showStats: getVal("landing_show_stats") || prev.showStats,
        showAnnouncement: getVal("landing_show_announcement") || prev.showAnnouncement,
        announcementText: getVal("landing_announcement_text") || prev.announcementText,
        heroImage: getVal("landing_hero_image") || prev.heroImage,
      }));
    }).catch(console.error);

    api.get("/api/public-stats").then((res) => setStats(res.data.data)).catch(() => {});
  }, []);

  /* --- Scroll-aware nav --- */
  const handleScroll = useCallback(() => {
    setNavScrolled(window.scrollY > 24);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  /* --- Process steps data --- */
  const steps = [
    {
      num: "01",
      title: "Penjadwalan & Orientasi",
      desc: "Registrasi, pembagian stase, dan penempatan ke Rumah Sakit jejaring oleh program studi secara otomatis.",
    },
    {
      num: "02",
      title: "Kegiatan Klinis & Logbook",
      desc: "Pencatatan aktivitas keseharian medis dengan diagnosis ICD dan tingkat kompetensi, disupervisi oleh Preceptor.",
    },
    {
      num: "03",
      title: "Evaluasi & Nilai Akhir",
      desc: "Ujian akhir stase (CBT, OSCE, Mini-CEX, DOPS) dinilai real-time, langsung masuk ke transkrip klinis.",
    },
  ];

  /* --- Feature blocks data --- */
  const features = [
    {
      icon: Clock,
      label: "Penjadwalan",
      title: "Rotasi klinis terdistribusi otomatis",
      desc: "Algoritma memetakan mahasiswa ke stase dengan memastikan kuota rasio Preceptor:Mahasiswa tetap ideal di setiap Rumah Sakit jejaring. Unduh surat pengantar secara digital.",
      Visual: RotationMockup,
      accentClass: "",
    },
    {
      icon: BookOpen,
      label: "Logbook",
      title: "Catatan klinis terverifikasi real-time",
      desc: "Input kasus pasien, tindakan, atau jaga lengkap dengan diagnosis ICD dan level kompetensi. Setiap entri diverifikasi langsung oleh Preceptor dengan sistem feedback internal.",
      Visual: LogbookMockup,
      accentClass: "--gold",
    },
    {
      icon: Stethoscope,
      label: "Evaluasi",
      title: "Penilaian terstandar dan transparan",
      desc: "Rubrik penilaian CBT, OSCE, DOPS, dan Mini-CEX diisi oleh penguji melalui aplikasi. Nilai langsung terintegrasi ke transkrip klinis mahasiswa.",
      Visual: AssessmentMockup,
      accentClass: "",
    },
    {
      icon: Wallet,
      label: "Keuangan",
      title: "Honorarium & billing terhitung otomatis",
      desc: "Kalkulasi otomatis biaya tagihan stase ke Rumah Sakit dan pencairan honorarium langsung ke rekening Preceptor berdasarkan beban verifikasi logbook.",
      Visual: DashboardMockup,
      accentClass: "--gold",
    },
  ];

  return (
    <div
      style={{ fontFamily: "var(--font-jakarta), system-ui, sans-serif" }}
      className={`${jakarta.variable} min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden selection:bg-blue-100`}
    >
      {/* Grain overlay */}
      <div className="landing-grain" aria-hidden="true" />

      {/* ============================================================
          SECTION 1 — Announcement + Navigation
          ============================================================ */}
      {config.showAnnouncement === "true" && config.announcementText && (
        <div className="bg-blue-900 text-white text-sm font-medium py-2 px-4 text-center relative z-[60]">
          {config.announcementText}
        </div>
      )}

      <nav
        className={`landing-nav ${navScrolled ? "landing-nav--scrolled" : ""} ${
          config.showAnnouncement === "true" && config.announcementText ? "!top-9" : ""
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            {config.appLogo ? (
              <img
                src={`${backendUrl}${config.appLogo}`}
                alt={`Logo ${config.appName}`}
                className="h-9 w-auto rounded object-contain"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900 text-white shadow-sm">
                <Activity className="h-5 w-5" />
              </div>
            )}
            <div>
              <span className="block text-lg font-bold leading-none text-slate-900 tracking-tight">
                {config.appName}
              </span>
              <span className="block text-[10px] font-medium tracking-widest text-slate-400 uppercase mt-0.5">
                Fakultas Kedokteran
              </span>
            </div>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#alur" className="landing-nav-link">Alur Pelaksanaan</a>
            <a href="#fitur" className="landing-nav-link">Fitur Sistem</a>
          </div>

          {/* CTA */}
          <Link href={config.ctaLink}>
            <button className="landing-btn-primary text-sm !py-2.5 !px-5">
              {config.ctaText}
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </nav>

      {/* ============================================================
          SECTION 2 — Hero (Dark Institutional)
          ============================================================ */}
      <section
        className="landing-hero-bg min-h-[100dvh] flex items-center pt-24 pb-20 lg:pt-32 lg:pb-28"
        style={config.heroImage ? {
          backgroundImage: `url(${backendUrl}${config.heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundBlendMode: "overlay",
        } : undefined}
      >
        <div className="landing-hero-grid" aria-hidden="true" />
        <div className="landing-hero-fade" aria-hidden="true" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left — Copy */}
            <div className={`${mounted ? "" : "opacity-0"}`}>
              {/* Badge */}
              <div className="landing-hero-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] backdrop-blur-md text-white/70 text-sm font-medium border border-white/[0.08] mb-8">
                <ShieldCheck className="h-3.5 w-3.5 text-yellow-400" />
                {config.badge}
              </div>

              {/* Heading */}
              <h1 className="landing-hero-heading text-[clamp(2.25rem,5.5vw,4rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-white mb-6 whitespace-pre-line" style={{ textWrap: "balance" as never }}>
                {config.title}
              </h1>

              {/* Description */}
              <p className="landing-hero-desc text-base lg:text-lg text-white/50 leading-relaxed max-w-xl mb-10">
                {config.description}
              </p>

              {/* CTA row */}
              <div className="landing-hero-cta flex flex-wrap items-center gap-4 mb-14">
                <Link href={config.ctaLink}>
                  <button className="landing-btn-primary--gold landing-btn-primary">
                    {config.ctaText}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
                <a href="#alur" className="landing-btn-ghost">
                  Lihat alur pelaksanaan
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>

              {/* Stats row */}
              {config.showStats === "true" && stats && (
                <div className="landing-hero-stats flex flex-wrap items-center gap-6 lg:gap-8">
                  <div>
                    <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                      <CountUp value={stats.hospitals} />
                    </div>
                    <div className="text-xs text-white/35 font-medium uppercase tracking-widest mt-1">Rumah Sakit</div>
                  </div>
                  <div className="landing-stat-divider hidden sm:block" />
                  <div>
                    <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                      <CountUp value={stats.students} />
                    </div>
                    <div className="text-xs text-white/35 font-medium uppercase tracking-widest mt-1">Mahasiswa</div>
                  </div>
                  <div className="landing-stat-divider hidden sm:block" />
                  <div>
                    <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                      <CountUp value={stats.logbook_entries} suffix="+" />
                    </div>
                    <div className="text-xs text-white/35 font-medium uppercase tracking-widest mt-1">Entri Logbook</div>
                  </div>
                  <div className="landing-stat-divider hidden sm:block" />
                  <div>
                    <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                      <CountUp value={stats.programs} />
                    </div>
                    <div className="text-xs text-white/35 font-medium uppercase tracking-widest mt-1">Program Studi</div>
                  </div>
                </div>
              )}
            </div>

            {/* Right — Abstract visual */}
            <div className="landing-hero-visual hidden lg:block">
              <DashboardMockup className="!bg-white/[0.04] !border-white/[0.06] [&_.landing-mock-bar]:!bg-white/[0.08] [&_.landing-mock-bar--accent]:!bg-white/[0.12] [&_.landing-mock-bar--gold]:!bg-yellow-400/[0.1] [&_*]:!border-white/[0.04] [&_.bg-slate-50]:!bg-white/[0.03] [&_.bg-slate-100]:!bg-white/[0.05] [&_.bg-white]:!bg-white/[0.04] [&_.text-green-600]:!text-green-400/60 [&_.text-yellow-600]:!text-yellow-400/60 [&_.text-slate-400]:!text-white/30 [&_.bg-green-50]:!bg-green-400/[0.06] [&_.bg-yellow-50]:!bg-yellow-400/[0.06]" />
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — Platform Overview
          ============================================================ */}
      <section className="py-24 lg:py-32 bg-white relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left — Copy */}
            <Reveal variant="up">
              <div className="landing-section-label">
                <span className="landing-section-label-dot" />
                Tentang Platform
              </div>
              <h2 className="landing-section-heading">
                Infrastruktur akademik dan klinis dalam satu platform
              </h2>
              <p className="landing-section-desc mb-8">
                ACMS menghubungkan seluruh stakeholder pendidikan profesi — dari Prodi, Rumah Sakit, Preceptor, hingga Mahasiswa — dalam satu ekosistem digital yang transparan dan teraudit.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  { icon: Hospital, text: "Distribusi otomatis ke rumah sakit jejaring" },
                  { icon: CheckCircle2, text: "Logbook dan penilaian terverifikasi real-time" },
                  { icon: ShieldCheck, text: "Rekam jejak terenkripsi dan diaudit berkala" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 flex-shrink-0">
                      <item.icon className="h-4 w-4" />
                    </div>
                    {item.text}
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Right — Stacked cards */}
            <Reveal variant="scale" delay={200}>
              <div className="relative">
                <div className="landing-overview-card p-1 -rotate-2 translate-y-4 opacity-30 absolute inset-0">
                  <div className="bg-slate-50 rounded-[12px] h-full" />
                </div>
                <div className="landing-overview-card p-1 rotate-1 translate-y-2 opacity-50 absolute inset-0">
                  <div className="bg-slate-50 rounded-[12px] h-full" />
                </div>
                <DashboardMockup className="!bg-white relative z-10 !shadow-xl !shadow-slate-900/[0.04]" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — Alur Pelaksanaan (Horizontal Steps)
          ============================================================ */}
      <section id="alur" className="py-24 lg:py-32 bg-slate-50 relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Reveal variant="up">
            <div className="text-center mb-16 lg:mb-20">
              <div className="landing-section-label justify-center">
                <span className="landing-section-label-dot" />
                Alur Pendidikan Profesi
              </div>
              <h2 className="landing-section-heading mx-auto" style={{ maxWidth: "36rem" }}>
                Tiga tahap menuju kompetensi klinis
              </h2>
              <p className="landing-section-desc mx-auto text-center">
                Ikuti panduan langkah demi langkah untuk memahami siklus rotasi klinis menggunakan sistem ACMS.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6">
            {steps.map((step, i) => (
              <Reveal key={step.num} variant="up" delay={i * 120}>
                <div className="landing-step relative text-center md:text-left group cursor-default">
                  {/* Connector (hidden on last & mobile) */}
                  {i < steps.length - 1 && (
                    <div className="landing-step-connector hidden md:block" aria-hidden="true" />
                  )}
                  {/* Number */}
                  <div className="landing-step-number mx-auto md:mx-0 mb-5">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto md:mx-0">
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 5 — Fitur Unggulan (Zig-zag)
          ============================================================ */}
      <section id="fitur" className="py-24 lg:py-32 bg-white relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Reveal variant="up">
            <div className="text-center mb-16 lg:mb-24">
              <div className="landing-section-label justify-center">
                <span className="landing-section-label-dot" />
                Fitur Sistem
              </div>
              <h2 className="landing-section-heading mx-auto" style={{ maxWidth: "36rem" }}>
                Dibangun untuk kebutuhan institusi medis
              </h2>
              <p className="landing-section-desc mx-auto text-center">
                Setiap modul dirancang khusus untuk operasional pendidikan profesi kedokteran, bukan template generik.
              </p>
            </div>
          </Reveal>

          <div className="flex flex-col gap-24 lg:gap-32">
            {features.map((feat, i) => {
              const isReversed = i % 2 === 1;
              return (
                <Reveal key={feat.label} variant={isReversed ? "right" : "left"} delay={100}>
                  <div className={`landing-feature-block ${isReversed ? "landing-feature-block--reversed" : ""}`}>
                    {/* Copy */}
                    <div>
                      <div className={`landing-accent-line${feat.accentClass ? ` landing-accent-line${feat.accentClass}` : ""}`} />
                      <div className="landing-section-label">
                        <feat.icon className="h-3.5 w-3.5" />
                        {feat.label}
                      </div>
                      <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight leading-tight mb-4" style={{ textWrap: "balance" as never }}>
                        {feat.title}
                      </h3>
                      <p className="text-slate-500 leading-relaxed max-w-lg">
                        {feat.desc}
                      </p>
                    </div>
                    {/* Visual */}
                    <div>
                      <feat.Visual />
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 6 — Trust & Security Banner
          ============================================================ */}
      <section className="landing-trust-banner py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <Reveal variant="up">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
              {/* Icon + copy */}
              <div className="flex items-center gap-5 flex-shrink-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm">
                  <Lock className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl lg:text-2xl font-bold text-white tracking-tight">Akses terpusat & teraudit</h3>
                  <p className="text-white/40 text-sm mt-1">Rekam jejak terenkripsi sesuai standar keamanan data medis</p>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden lg:block w-px h-16 bg-white/[0.08]" />

              {/* Statement */}
              <p className="text-white/50 text-sm leading-relaxed flex-1 text-center lg:text-left max-w-xl">
                Dengan login ke sistem, Anda menyatakan siap mematuhi seluruh kode etik kedokteran dan aturan rotasi yang berlaku di Rumah Sakit jejaring. Sistem ini diaudit berkala untuk memastikan rekam jejak logbook valid.
              </p>

              {/* CTA */}
              <Link href="/login" className="flex-shrink-0">
                <button className="landing-btn-primary !bg-white !text-slate-900 hover:!bg-slate-100 group">
                  Masuk ke Dashboard
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          SECTION 7 — Footer (shared component)
          ============================================================ */}
      <div className="relative z-20">
        <LandingFooter accent="blue" icon={Activity} />
      </div>
    </div>
  );
}
