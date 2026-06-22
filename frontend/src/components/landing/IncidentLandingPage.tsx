"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ShieldAlert, AlertTriangle, UserCheck,
  HeartHandshake, Lock, ShieldCheck, HardHat, MessageSquare,
  AlertOctagon, FileText, Search, CheckCircle2, Scale, HelpCircle, ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import LandingFooter from "@/components/landing/LandingFooter";
import Reveal from "@/components/landing/Reveal";
import Parallax from "@/components/landing/Parallax";
import { jakarta } from "@/lib/fonts";

class Particle {
  x: number;
  y: number;
  size: number;
  baseX: number;
  baseY: number;
  density: number;
  color: string;
  angle: number;
  speed: number;

  constructor(x: number, y: number, color: string) {
    this.x = x + (Math.random() * 20 - 10);
    this.y = y + (Math.random() * 20 - 10);
    this.baseX = x;
    this.baseY = y;
    this.size = Math.random() * 2.5 + 1;
    this.density = (Math.random() * 30) + 1;
    this.color = color;
    this.angle = Math.random() * 360;
    this.speed = (Math.random() * 0.02) + 0.005;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }

  update(mouse: { x: number; y: number; radius: number }) {
    this.angle += this.speed;
    const driftX = Math.cos(this.angle) * 3;
    const driftY = Math.sin(this.angle) * 3;

    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const forceDirectionX = dx / distance;
    const forceDirectionY = dy / distance;
    const maxDistance = mouse.radius;
    const force = (maxDistance - distance) / maxDistance;
    const directionX = forceDirectionX * force * this.density;
    const directionY = forceDirectionY * force * this.density;

    if (distance < mouse.radius) {
      this.x -= directionX * 2;
      this.y -= directionY * 2;
    } else {
      if (this.x !== this.baseX) {
        const ddx = this.x - (this.baseX + driftX);
        this.x -= ddx / 20;
      }
      if (this.y !== this.baseY) {
        const ddy = this.y - (this.baseY + driftY);
        this.y -= ddy / 20;
      }
    }
  }
}

interface CategoryCard {
  title: string;
  description: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface LandingConfig {
  title: string;
  badge: string;
  description: string;
  appName: string;
  appLogo: string;
  ctaText: string;
  ctaLink: string;
  showConsultation: boolean;
  emergencyBanner: string;
  slaText: string;
  legalBasis: string;
  justCulture: string;
  categories: CategoryCard[];
  faq: FaqItem[];
}

// Palet ikon & warna untuk kartu kategori (di-cycle berdasar indeks).
const CARD_ICONS: LucideIcon[] = [AlertTriangle, UserCheck, HardHat, HeartHandshake, ShieldAlert, MessageSquare];
const CARD_COLORS = [
  { bg: "bg-red-50", text: "text-red-600" },
  { bg: "bg-blue-50", text: "text-blue-600" },
  { bg: "bg-yellow-50", text: "text-yellow-600" },
  { bg: "bg-purple-50", text: "text-purple-600" },
  { bg: "bg-rose-50", text: "text-rose-600" },
  { bg: "bg-indigo-50", text: "text-indigo-600" },
];

const DEFAULT_CATEGORIES: CategoryCard[] = [
  { title: "Patient Safety", description: "Kejadian Nyaris Cedera (KNC), Kejadian Tidak Diharapkan (KTD), atau Sentinel Event yang melibatkan pasien." },
  { title: "Student Safety", description: "Insiden yang mengancam keselamatan fisik atau psikologis mahasiswa selama rotasi klinis (Kepaniteraan Klinik)." },
  { title: "K3", description: "Keselamatan & Kesehatan Kerja di lingkungan rumah sakit pendidikan: kepatuhan APD, bahaya fisik-kimia-biologis." },
  { title: "Perundungan & Etik", description: "Perundungan, kekerasan verbal/non-verbal, pelecehan, atau pelanggaran kode etik profesional oleh pihak manapun." },
];

const PROCESS_STEPS = [
  { icon: FileText, title: "1. Anda Melapor", desc: "Kirim laporan melalui form (anonim atau teridentifikasi). Sertakan kronologi dan bukti bila ada." },
  { icon: Search, title: "2. Ditelaah & Diinvestigasi", desc: "Tim berwenang menelaah, mengklasifikasi tingkat keparahan, dan menindaklanjuti sesuai SOP." },
  { icon: CheckCircle2, title: "3. Ditindaklanjuti", desc: "Tindakan korektif dilakukan dan dijadikan pembelajaran sistem. Pelapor dilindungi selama proses." },
];

export default function IncidentLandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<LandingConfig>({
    title: "Sistem Pelaporan Insiden & Keselamatan Terpadu",
    badge: "Kerahasiaan Terjamin (Anonymous Allowed)",
    description: "Platform aman dan rahasia untuk melaporkan insiden Keselamatan Pasien, Keselamatan Mahasiswa, K3, Perundungan/Bullying, Pelanggaran Etik, serta saluran Konsultasi Rahasia di lingkungan akademik klinis.",
    appName: "ACMS Safety",
    appLogo: "",
    ctaText: "Buat Laporan Sekarang",
    ctaLink: "/login",
    showConsultation: true,
    emergencyBanner: "",
    slaText: "",
    legalBasis: "",
    justCulture: "",
    categories: DEFAULT_CATEGORIES,
    faq: [],
  });

  useEffect(() => {
    setMounted(true);

    api.get("/api/public-settings").then((res) => {
      const data: { key: string; value: string }[] = res.data;
      const getVal = (key: string) => data.find((s) => s.key === key)?.value;

      const parseJson = <T,>(key: string, fallback: T): T => {
        const raw = getVal(key);
        if (!raw) return fallback;
        try {
          return JSON.parse(raw) as T;
        } catch {
          return fallback;
        }
      };

      const showConsultation = getVal("incident_show_consultation");
      const categories = parseJson<CategoryCard[]>("incident_categories", DEFAULT_CATEGORIES)
        .filter((c) => c.title);
      const faq = parseJson<FaqItem[]>("incident_faq", []).filter((f) => f.question);

      setConfig((prev) => ({
        ...prev,
        appName: getVal("app_name") ? `${getVal("app_name")} Safety` : prev.appName,
        appLogo: getVal("app_logo") || prev.appLogo,
        title: getVal("incident_title") || prev.title,
        badge: getVal("incident_hero_badge") || prev.badge,
        description: getVal("incident_description") || prev.description,
        ctaText: getVal("incident_cta_text") || prev.ctaText,
        ctaLink: getVal("incident_cta_link") || prev.ctaLink,
        showConsultation: showConsultation !== undefined ? showConsultation !== "false" : prev.showConsultation,
        emergencyBanner: getVal("incident_emergency_banner") ?? prev.emergencyBanner,
        slaText: getVal("incident_sla_text") || prev.slaText,
        legalBasis: getVal("incident_legal_basis") || prev.legalBasis,
        justCulture: getVal("incident_just_culture") || prev.justCulture,
        categories: categories.length > 0 ? categories : prev.categories,
        faq,
      }));
    }).catch(console.error);

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const { clientX, clientY } = e;
      const xPos = (clientX / window.innerWidth) * 100;
      const yPos = (clientY / window.innerHeight) * 100;
      containerRef.current.style.setProperty("--mouse-x", `${xPos}%`);
      containerRef.current.style.setProperty("--mouse-y", `${yPos}%`);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Canvas Particle Animation — dilewati bila pengguna meminta gerak minimal (aksesibilitas).
  useEffect(() => {
    const prefersReduced = typeof window !== "undefined"
      && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particlesArray: Particle[] = [];
    let animationFrameId: number;

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, radius: 150 };

    const updateMousePos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const updateTouchPos = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - rect.left;
      mouse.y = e.touches[0].clientY - rect.top;
    };

    window.addEventListener("mousemove", updateMousePos);
    window.addEventListener("touchmove", updateTouchPos);

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesArray = [];

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      const strands = 2;
      const pointsPerStrand = window.innerWidth < 768 ? 80 : 150;
      const amplitude = window.innerWidth < 768 ? 80 : 120;
      const frequency = 0.005;
      const spacing = width / pointsPerStrand;
      const colors = ["#dc2626", "#ef4444", "#f87171", "#fca5a5"];

      for (let s = 0; s < strands; s++) {
        const offset = s * Math.PI;
        for (let i = 0; i < pointsPerStrand; i++) {
          const x = i * spacing;
          const y = centerY + Math.sin(x * frequency + offset) * amplitude;
          particlesArray.push(new Particle(x, y, colors[s % colors.length]));
          for (let j = 0; j < 3; j++) {
            const scatterX = x + (Math.random() * 40 - 20);
            const scatterY = y + (Math.random() * 40 - 20);
            particlesArray.push(new Particle(scatterX, scatterY, colors[Math.floor(Math.random() * colors.length)]));
          }
          if (s === 0 && i % 4 === 0) {
            const oppositeY = centerY + Math.sin(x * frequency + offset + Math.PI) * amplitude;
            for (let step = 1; step < 6; step++) {
              particlesArray.push(new Particle(x, y + ((oppositeY - y) * (step / 6)), "#fecaca"));
            }
          }
        }
      }

      const ambientCount = window.innerWidth < 768 ? 100 : 300;
      for (let i = 0; i < ambientCount; i++) {
        particlesArray.push(new Particle(Math.random() * width, Math.random() * height, colors[Math.floor(Math.random() * colors.length)]));
      }
    };

    const connect = () => {
      for (let a = 0; a < particlesArray.length; a += 3) {
        for (let b = a; b < particlesArray.length; b += 3) {
          const distance = ((particlesArray[a].x - particlesArray[b].x) ** 2) + ((particlesArray[a].y - particlesArray[b].y) ** 2);
          if (distance < 1500) {
            ctx.strokeStyle = `rgba(220, 38, 38, ${(1 - distance / 1500) * 0.2})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particlesArray) { p.draw(ctx); p.update(mouse); }
      connect();
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();
    window.addEventListener("resize", init);

    return () => {
      window.removeEventListener("mousemove", updateMousePos);
      window.removeEventListener("touchmove", updateTouchPos);
      window.removeEventListener("resize", init);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  return (
    <div ref={containerRef} style={{ fontFamily: "var(--font-jakarta), system-ui, sans-serif" }} className={`${jakarta.variable} min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden selection:bg-red-200 flex flex-col`}>
      <style dangerouslySetInnerHTML={{__html: `
        :root { --mouse-x: 50%; --mouse-y: 50%; }
        .safety-gradient { background: linear-gradient(135deg, #fef2f2 0%, #fff 100%); }
        .cursor-glow { position: absolute; inset: 0; background: radial-gradient(circle 600px at var(--mouse-x) var(--mouse-y), rgba(220,38,38,0.05), transparent 80%); z-index: 1; }
      `}} />

      {/* Emergency triage strip — slim bar full-width di paling atas */}
      {config.emergencyBanner && (
        <div className="bg-red-600 text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center sm:px-6">
            <AlertOctagon className="h-4 w-4 shrink-0" />
            <p className="text-[11px] font-medium leading-snug sm:text-xs">{config.emergencyBanner}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {config.appLogo ? (
              <img src={`${BACKEND_URL}${config.appLogo}`} alt="Logo" className="h-9 w-auto rounded object-contain" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
                <ShieldAlert className="h-5 w-5" />
              </div>
            )}
            <div>
              <span className="block font-bold text-lg leading-none text-slate-900 tracking-tight">{config.appName}</span>
              <span className="block text-[10px] font-bold tracking-widest text-red-600 uppercase mt-0.5">Incident Reporting</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {config.showConsultation && (
              <Link href={config.ctaLink}>
                <Button variant="ghost" className="text-blue-700 hover:text-blue-800 hover:bg-blue-50 h-9 px-4 font-semibold text-sm hidden sm:flex">
                  <MessageSquare className="h-4 w-4 mr-1.5" /> Konsultasi
                </Button>
              </Link>
            )}
            <Link href={config.ctaLink}>
              <Button className="rounded-full shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all bg-red-600 hover:bg-red-700 h-9 px-5 font-semibold text-sm">
                Masuk / Lapor
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-28 overflow-hidden safety-gradient">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 pointer-events-auto" style={{ opacity: 0.6 }} aria-hidden="true" />
        <div className="cursor-glow pointer-events-none"></div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10 pointer-events-none">
          <div className="max-w-3xl mx-auto text-center">
            <div className={`transition-all duration-1000 transform ${mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"} pointer-events-auto`}>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-700 font-semibold text-sm mb-8 border border-red-100 shadow-sm">
                <Lock className="h-4 w-4" /> {config.badge}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-balance text-slate-900 mb-8">
                {config.title}
              </h1>
              <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                {config.description}
              </p>

              <div className="flex flex-wrap gap-4 justify-center">
                <Link href={config.ctaLink}>
                  <Button size="lg" className="rounded-full h-14 px-8 text-base font-semibold shadow-xl shadow-red-500/25 transition-all bg-red-600 hover:bg-red-700 hover:-translate-y-1">
                    <ShieldAlert className="mr-2 h-5 w-5" /> {config.ctaText}
                  </Button>
                </Link>
                <Link href="/safety/sop">
                  <Button size="lg" variant="outline" className="rounded-full h-14 px-8 text-base font-semibold border-slate-200 bg-white hover:bg-slate-50 transition-all hover:-translate-y-1">
                    Pelajari Prosedur
                  </Button>
                </Link>
              </div>

              {config.showConsultation && (
                <p className="text-sm text-slate-500 mt-6">
                  Butuh konsultasi rahasia?{" "}
                  <Link href={config.ctaLink} className="text-blue-600 hover:underline font-semibold">
                    Gunakan saluran konsultasi <ArrowRight className="inline h-3.5 w-3.5" />
                  </Link>
                </p>
              )}

            </div>
          </div>
        </div>

        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 pointer-events-none -z-10"></div>
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 pointer-events-none -z-10"></div>
      </section>

      {/* Kategori Pelaporan (dinamis dari setting) */}
      <section id="kategori" className="relative overflow-hidden py-24 bg-slate-50 border-t border-slate-100">
        {/* Objek dekoratif parallax */}
        <Parallax speed={0.25} className="pointer-events-none absolute -top-10 -left-16 -z-0">
          <div className="w-72 h-72 rounded-full bg-red-200/40 blur-3xl" />
        </Parallax>
        <Parallax speed={-0.2} className="pointer-events-none absolute top-40 -right-20 -z-0">
          <div className="w-80 h-80 rounded-full bg-rose-200/40 blur-3xl" />
        </Parallax>

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <Reveal variant="up" className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Kategori Pelaporan</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Kami menangani berbagai jenis insiden dengan prosedur operasional standar (SOP) yang ketat untuk menjamin keselamatan dan keadilan.</p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {config.categories.map((cat, i) => {
              const Icon = CARD_ICONS[i % CARD_ICONS.length];
              const color = CARD_COLORS[i % CARD_COLORS.length];
              return (
                <Reveal key={i} delay={i * 110} variant="scale" className="h-full">
                  <div className="h-full bg-white p-7 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    <div className={`w-11 h-11 ${color.bg} ${color.text} rounded-xl flex items-center justify-center mb-5`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{cat.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{cat.description}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Konsultasi Rahasia CTA */}
          {config.showConsultation && (
            <Reveal className="mt-10 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center shrink-0">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Konsultasi Rahasia</h3>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-xl">
                    Tidak menemukan kategori yang sesuai, atau ingin berdiskusi terlebih dahulu?
                    Gunakan saluran konsultasi rahasia kami — langsung dijawab oleh tim yang berwenang. Dapat dilakukan secara anonim.
                  </p>
                </div>
              </div>
              <Link href={config.ctaLink} className="shrink-0">
                <Button className="rounded-full bg-blue-700 hover:bg-blue-800 text-white h-11 px-7 font-semibold shadow-md shadow-blue-500/20 whitespace-nowrap">
                  Mulai Konsultasi
                </Button>
              </Link>
            </Reveal>
          )}
        </div>
      </section>

      {/* Bagaimana Laporan Ditangani (proses + SLA) */}
      <section className="relative overflow-hidden py-24 bg-white border-t border-slate-100">
        <Parallax speed={0.3} className="pointer-events-none absolute top-10 right-10 -z-0">
          <div className="w-64 h-64 rounded-full bg-red-100/50 blur-3xl" />
        </Parallax>

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <Reveal variant="up" className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Bagaimana Laporan Ditangani</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Proses yang transparan agar Anda tahu persis apa yang terjadi setelah melapor.</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PROCESS_STEPS.map((step, i) => (
              <Reveal key={i} delay={i * 140} variant={i === 0 ? "left" : i === 2 ? "right" : "up"} className="relative bg-slate-50 rounded-2xl p-7 border border-slate-100">
                <div className="w-12 h-12 bg-red-600 text-white rounded-xl flex items-center justify-center mb-5 shadow-sm shadow-red-600/20">
                  <step.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </Reveal>
            ))}
          </div>

          {config.slaText && (
            <Reveal className="mt-8 max-w-5xl mx-auto flex items-center justify-center gap-3 bg-red-50 border border-red-100 rounded-xl p-4 text-red-800 text-sm font-medium">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{config.slaText}</span>
            </Reveal>
          )}
        </div>
      </section>

      {/* Komitmen Kami (just culture + anti-retaliasi + dasar hukum) */}
      {(config.justCulture || config.legalBasis) && (
        <section className="relative overflow-hidden py-24 bg-slate-900 text-slate-300">
          <Parallax speed={0.35} className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2">
            <div className="w-[40rem] h-[40rem] rounded-full bg-red-600/10 blur-3xl" />
          </Parallax>

          <div className="relative z-10 mx-auto max-w-5xl px-6 lg:px-8">
            <Reveal variant="blur" className="text-center mb-12">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white mb-5">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Komitmen Kami</h2>
            </Reveal>

            <Reveal className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {config.justCulture && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-7">
                  <div className="flex items-center gap-3 mb-3">
                    <HeartHandshake className="h-5 w-5 text-red-400" />
                    <h3 className="font-bold text-white">Budaya Tanpa Menyalahkan & Anti-Retaliasi</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-400">{config.justCulture}</p>
                  <Link href="/safety/protection" className="inline-flex items-center gap-1 text-sm font-semibold text-red-400 hover:text-red-300 mt-4">
                    Baca Kebijakan Perlindungan Pelapor <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
              {config.legalBasis && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-7">
                  <div className="flex items-center gap-3 mb-3">
                    <Scale className="h-5 w-5 text-blue-400" />
                    <h3 className="font-bold text-white">Dasar Hukum & Tata Kelola</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-400">{config.legalBasis}</p>
                  <Link href="/safety/sop" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-400 hover:text-blue-300 mt-4">
                    Lihat SOP Pelaporan <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </Reveal>
          </div>
        </section>
      )}

      {/* FAQ */}
      {config.faq.length > 0 && (
        <section className="py-24 bg-white border-t border-slate-100">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <Reveal className="text-center mb-12">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 mb-5">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Pertanyaan Umum</h2>
              <p className="text-slate-500">Hal-hal yang sering ditanyakan sebelum melapor.</p>
            </Reveal>

            <Reveal className="divide-y divide-slate-100 border-t border-slate-100">
              {config.faq.map((item, i) => (
                <details key={i} className="group py-5">
                  <summary className="flex justify-between items-center cursor-pointer list-none font-semibold text-slate-900">
                    <span>{item.question}</span>
                    <ChevronDown className="h-5 w-5 text-slate-400 transition-transform group-open:rotate-180 shrink-0 ml-4" />
                  </summary>
                  <p className="mt-3 text-slate-600 text-sm leading-relaxed">{item.answer}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {/* Footer */}
      <LandingFooter accent="red" icon={ShieldCheck} className="mt-auto" />
    </div>
  );
}
