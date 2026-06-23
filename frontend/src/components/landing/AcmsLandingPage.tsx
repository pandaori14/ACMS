"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Activity, ShieldCheck,
  Stethoscope, Clock,
  Wallet, PersonStanding, CheckCircle2, Hospital
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { AppSetting } from "@/lib/api-helpers";
import LandingFooter from "@/components/landing/LandingFooter";
import { jakarta } from "@/lib/fonts";
import Reveal from "@/components/landing/Reveal";

export default function AcmsLandingPage() {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [landingConfig, setLandingConfig] = useState({
    title: "Standar Profesionalisme Klinis Medis.",
    badge: "Layanan Resmi Pendidikan Profesi",
    description: "Sistem manajemen terintegrasi untuk Academic Clinical Management System (ACMS). Akurat, objektif, dan dikelola oleh tenaga ahli profesional.",
    appName: "ACMS",
    appLogo: "",
    ctaText: "Masuk Portal",
    ctaLink: "/login",
    showStats: "true",
    showAnnouncement: "false",
    announcementText: "",
    heroImage: "",
  });
  const [stats, setStats] = useState<{ hospitals: number; logbook_entries: number; students: number; programs: number } | null>(null);

  useEffect(() => {
    setMounted(true);

    // Fetch public settings
    api.get("/api/public-settings").then((res) => {
      const data = res.data;
      const getVal = (key: string) => data.find((s: AppSetting) => s.key === key)?.value;

      setLandingConfig(prev => ({
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

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      const xPos = (clientX / innerWidth) * 100;
      const yPos = (clientY / innerHeight) * 100;

      containerRef.current.style.setProperty('--mouse-x', `${xPos}%`);
      containerRef.current.style.setProperty('--mouse-y', `${yPos}%`);

      // Parallax for glass card
      const normalizedX = (clientX / innerWidth) * 2 - 1;
      const normalizedY = (clientY / innerHeight) * 2 - 1;
      const tiltX = normalizedY * -10;
      const tiltY = normalizedX * 10;

      containerRef.current.style.setProperty('--tilt-x', `${tiltX}deg`);
      containerRef.current.style.setProperty('--tilt-y', `${tiltY}deg`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Canvas Particle Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particlesArray: Particle[] = [];
    let animationFrameId: number;

    const mouse = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      radius: 150 // Magnet area
    };

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

    window.addEventListener('mousemove', updateMousePos);
    window.addEventListener('touchmove', updateTouchPos);

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

      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }

      update() {
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
            const dx = this.x - (this.baseX + driftX);
            this.x -= dx / 20;
          }
          if (this.y !== this.baseY) {
            const dy = this.y - (this.baseY + driftY);
            this.y -= dy / 20;
          }
        }
      }
    }

    const init = () => {
      if (!canvas) return;
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

      const colors = ['#2563eb', '#38bdf8', '#818cf8', '#60a5fa'];

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
            const steps = 6;
            for (let step = 1; step < steps; step++) {
              const bridgeY = y + ((oppositeY - y) * (step / steps));
              particlesArray.push(new Particle(x, bridgeY, '#cbd5e1'));
            }
          }
        }
      }

      const ambientCount = window.innerWidth < 768 ? 100 : 300;
      for (let i = 0; i < ambientCount; i++) {
        particlesArray.push(new Particle(
          Math.random() * width,
          Math.random() * height,
          colors[Math.floor(Math.random() * colors.length)]
        ));
      }
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].draw();
        particlesArray[i].update();
      }

      connect();
      animationFrameId = requestAnimationFrame(animate);
    };

    const connect = () => {
      let opacityValue = 1;
      for (let a = 0; a < particlesArray.length; a += 3) {
        for (let b = a; b < particlesArray.length; b += 3) {
          const distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x))
            + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));

          if (distance < 1500) {
            opacityValue = 1 - (distance / 1500);
            ctx.strokeStyle = `rgba(148, 163, 184, ${opacityValue * 0.2})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    };

    init();
    animate();

    const handleResize = () => {
      init();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', updateMousePos);
      window.removeEventListener('touchmove', updateTouchPos);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ fontFamily: "var(--font-jakarta), system-ui, sans-serif" }} className={`${jakarta.variable} min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden selection:bg-blue-200`}>
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --primary: #2b4a8b;
          --primary-light: #eef2f8;
          --accent: #c99a3b;
          --radius-md: 20px;
          --radius-lg: 32px;
          --mouse-x: 50%;
          --mouse-y: 50%;
          --tilt-x: 0deg;
          --tilt-y: 0deg;
        }
        .font-display {
          font-family: var(--font-jakarta), 'Plus Jakarta Sans', system-ui, sans-serif;
          letter-spacing: -0.03em;
          text-wrap: balance;
        }

        .cursor-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background: radial-gradient(
            circle 800px at var(--mouse-x) var(--mouse-y),
            rgba(43, 74, 139, 0.08),
            transparent 70%
          );
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: var(--radius-lg);
          box-shadow: 0 24px 50px rgba(43, 74, 139, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
          transform: perspective(1000px) rotateX(var(--tilt-x)) rotateY(var(--tilt-y)) translateY(-5px);
          transition: transform 0.1s ease-out;
          will-change: transform;
        }

        .bento-card {
          background: white;
          border-radius: var(--radius-md);
          border: 1px solid #f1f5f9;
          box-shadow: 0 4px 20px rgba(43, 74, 139, 0.05);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .bento-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            800px circle at var(--mouse-x) var(--mouse-y),
            rgba(43, 74, 139, 0.06),
            transparent 40%
          );
          opacity: 0;
          transition: opacity 0.5s ease;
          z-index: 0;
          pointer-events: none;
        }
        .bento-card:hover::before {
          opacity: 1;
        }
        .bento-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 34px rgba(43, 74, 139, 0.12);
          border-color: rgba(43, 74, 139, 0.15);
        }

        .bento-content {
          position: relative;
          z-index: 1;
        }

        .timeline-container::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0; width: 2px;
          background: #f1f5f9;
        }
        .timeline-indicator {
          position: absolute;
          left: -40px; top: 0;
          width: 32px; height: 32px;
          border-radius: 50%;
          background: white;
          border: 2px solid #2b4a8b;
          display: flex; align-items: center; justify-content: center;
          transform: translateX(-50%);
          color: #2b4a8b;
          font-weight: 700; font-size: 0.9rem;
          box-shadow: 0 0 0 4px rgba(43, 74, 139, 0.1);
          z-index: 2;
        }
      `}} />

      {/* --- Navigation --- */}
      {landingConfig.showAnnouncement === "true" && landingConfig.announcementText && (
        <div className="bg-red-600 text-white text-sm font-medium py-2 px-4 text-center relative z-[60]">
          {landingConfig.announcementText}
        </div>
      )}
      <nav className={`fixed ${landingConfig.showAnnouncement === "true" && landingConfig.announcementText ? 'top-9' : 'top-0'} left-0 right-0 z-50 border-b border-slate-900/5 bg-white/80 backdrop-blur-xl transition-all`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {landingConfig.appLogo ? (
              <img src={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}${landingConfig.appLogo}`} alt="Logo" className="h-9 w-auto rounded object-contain" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2b4a8b] text-white shadow-sm">
                <Activity className="h-5 w-5" />
              </div>
            )}
            <div>
              <span className="block font-display text-lg font-bold leading-none text-slate-900">{landingConfig.appName}</span>
              <span className="block text-[10px] font-medium tracking-wide text-slate-500 uppercase mt-0.5">Fakultas Kedokteran</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#alur" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Alur Pelaksanaan</a>
            <a href="#fitur" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Fitur Sistem</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href={landingConfig.ctaLink}>
              <Button className="rounded-full shadow-lg shadow-[#2b4a8b]/25 hover:shadow-[#2b4a8b]/40 transition-all bg-[#2b4a8b] hover:bg-[#22407a] hover:-translate-y-0.5 h-10 px-6 font-semibold">
                {landingConfig.ctaText} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section
        className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden min-h-[90vh] flex items-center bg-slate-50/50"
        style={landingConfig.heroImage ? {
          backgroundImage: `url(${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}${landingConfig.heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay',
          backgroundColor: 'rgba(248, 250, 252, 0.85)'
        } : {}}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-0 pointer-events-auto"
          style={{ opacity: 0.6 }}
        />

        <div className="cursor-glow pointer-events-none"></div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10 pointer-events-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left Copy */}
            <div className={`transition-all duration-1000 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} pointer-events-auto`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md text-blue-700 font-semibold text-sm mb-6 border border-blue-100 shadow-sm shadow-blue-100/50">
                <ShieldCheck className="h-4 w-4" /> {landingConfig.badge}
              </div>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-[4.2rem] font-extrabold leading-[1.1] tracking-tight text-slate-900 mb-6 drop-shadow-sm whitespace-pre-line">
                {landingConfig.title}
              </h1>
              <p className="text-lg text-slate-600 mb-10 max-w-lg leading-relaxed bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white">
                {landingConfig.description}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href={landingConfig.ctaLink}>
                  <Button size="lg" className="rounded-full h-14 px-8 text-base font-semibold shadow-xl shadow-[#2b4a8b]/25 transition-all bg-[#2b4a8b] hover:bg-[#22407a] hover:-translate-y-1">
                    {landingConfig.ctaText}
                  </Button>
                </Link>
                <a href="#alur">
                  <Button size="lg" variant="outline" className="rounded-full h-14 px-8 text-base font-semibold border-slate-200 bg-white/80 backdrop-blur-md hover:bg-slate-50 transition-all hover:-translate-y-1">
                    Lihat Alur
                  </Button>
                </a>
              </div>
            </div>

            {/* Right Glass Card (3D Parallax) */}
            <div className={`hidden lg:block transition-all duration-1000 delay-200 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} pointer-events-auto`}>
              <div className="glass-card p-10 relative">
                {/* Decorative reflection line */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-50 rounded-[inherit] pointer-events-none" />

                <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-200/50">
                  <h3 className="font-display text-xl font-bold text-slate-900">Periode Berjalan</h3>
                  <span className="px-4 py-1.5 rounded-full bg-[#c99a3b]/15 text-[#9a7325] text-sm font-bold border border-[#c99a3b]/30">2026/2027</span>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4 transform transition-transform hover:translate-x-2">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
                      <Clock className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Siklus Rotasi</h4>
                      <p className="text-sm text-slate-500 mt-1">Sistem penjadwalan stase otomatis<br/>setiap 4 - 10 minggu berturut-turut.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 transform transition-transform hover:translate-x-2">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 shadow-inner">
                      <Hospital className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Jejaring RS</h4>
                      <p className="text-sm text-slate-500 mt-1">Distribusi ke {stats?.hospitals ?? "—"} Rumah Sakit<br/>pendidikan utama dan satelit.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 transform transition-transform hover:translate-x-2">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Evaluasi Real-time</h4>
                      <p className="text-sm text-slate-500 mt-1">Verifikasi logbook dan penilaian CBT/OSCE<br/>terintegrasi di satu platform.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- Timeline / Alur Section --- */}
      <section id="alur" className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <Reveal variant="up" className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Alur Pendidikan Profesi</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">Ikuti panduan langkah demi langkah di bawah ini untuk memahami siklus klinis menggunakan sistem ACMS.</p>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7 pl-10 relative timeline-container">

              <div className="relative mb-12 last:mb-0 group">
                <div className="timeline-indicator transition-transform group-hover:scale-110 group-hover:bg-[#2b4a8b] group-hover:text-white">1</div>
                <div className="bento-card p-8 group-hover:-translate-y-1">
                  <div className="bento-content">
                    <h3 className="font-display text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">Penjadwalan & Orientasi</h3>
                    <p className="text-slate-600 mb-4">Proses registrasi dan pembagian stase rumah sakit oleh program studi.</p>
                    <ul className="list-disc pl-5 space-y-2 text-slate-500 text-sm">
                      <li>Pilih menu <strong>Jadwal Rotasi</strong> untuk melihat penempatan stase Anda.</li>
                      <li>Unduh surat pengantar institusi secara digital.</li>
                      <li>Lapor ke Rumah Sakit dan pembimbing (Preceptor) pada hari pertama.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="relative mb-12 last:mb-0 group">
                <div className="timeline-indicator transition-transform group-hover:scale-110 group-hover:bg-[#2b4a8b] group-hover:text-white">2</div>
                <div className="bento-card p-8 group-hover:-translate-y-1">
                  <div className="bento-content">
                    <h3 className="font-display text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">Kegiatan Klinis & Logbook</h3>
                    <p className="text-slate-600 mb-4">Pencatatan aktivitas keseharian medis yang disupervisi langsung.</p>
                    <ul className="list-disc pl-5 space-y-2 text-slate-500 text-sm">
                      <li>Input kegiatan Kasus Pasien, Tindakan, atau Jaga di menu <strong>Logbook</strong>.</li>
                      <li>Sertakan diagnosis ICD dan tingkat kompetensi (Level 1-4).</li>
                      <li>Tunggu verifikasi dan *feedback* dari Preceptor secara online.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="relative mb-12 last:mb-0 group">
                <div className="timeline-indicator transition-transform group-hover:scale-110 group-hover:bg-[#2b4a8b] group-hover:text-white">3</div>
                <div className="bento-card p-8 group-hover:-translate-y-1">
                  <div className="bento-content">
                    <h3 className="font-display text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">Ujian Akhir Stase & Nilai</h3>
                    <p className="text-slate-600 mb-4">Evaluasi komprehensif penutup stase dan penerbitan transkrip klinis.</p>
                    <ul className="list-disc pl-5 space-y-2 text-slate-500 text-sm">
                      <li>Ikuti jadwal ujian (CBT, OSCE, DOPS, Mini-CEX) yang tertera di sistem.</li>
                      <li>Penguji akan memasukkan nilai rubrik via aplikasi secara real-time.</li>
                      <li>Nilai akhir stase akan langsung masuk ke halaman <strong>Transkrip</strong> Anda.</li>
                    </ul>
                  </div>
                </div>
              </div>

            </div>

            <div className="lg:col-span-5 sticky top-28">
              <div className="rounded-[24px] bg-slate-900 p-10 text-white shadow-2xl shadow-slate-900/20 transform transition-all duration-500 hover:scale-[1.02] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <ShieldCheck className="h-48 w-48" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <h3 className="font-display text-2xl font-bold">Akses Terpusat</h3>
                  </div>
                  <p className="text-slate-400 mb-8 leading-relaxed">
                    Dengan login ke dalam sistem, Anda menyatakan siap untuk mematuhi seluruh kode etik kedokteran dan aturan rotasi yang berlaku di Rumah Sakit jejaring.
                  </p>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
                    <p className="text-sm text-slate-300">&quot;Sistem ini diaudit secara berkala untuk memastikan rekam jejak logbook valid dan terenkripsi.&quot;</p>
                  </div>
                  <Link href="/login" className="block">
                    <Button className="w-full h-14 rounded-full bg-white text-slate-900 hover:bg-slate-100 font-bold text-base transition-all hover:-translate-y-1 group">
                      Masuk ke Dashboard <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Bento Grid Section (Ketentuan & Statistik) --- */}
      {landingConfig.showStats === "true" && (
      <section id="fitur" className="py-24 bg-white relative">
        <div className="cursor-glow"></div>
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <Reveal variant="up" className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Ekosistem Terpadu</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">Infrastruktur pendukung operasional akademik dan administrasi finansial rumah sakit.</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* Bento 1: Kapasitas */}
            <div className="md:col-span-4 bento-card p-8 flex flex-col group">
              <div className="bento-content flex flex-col h-full">
                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 mb-6 transition-transform group-hover:scale-110 group-hover:bg-blue-100 group-hover:text-blue-600">
                  <PersonStanding className="h-6 w-6" />
                </div>
                <h4 className="font-display text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">Distribusi Presisi</h4>
                <p className="text-slate-500 text-sm leading-relaxed flex-grow">
                  Sistem memetakan mahasiswa secara otomatis ke berbagai stase dengan memastikan kuota rasio Preceptor:Mahasiswa tetap ideal di setiap Rumah Sakit.
                </p>
              </div>
            </div>

            {/* Bento 2: Finansial (Highlight) */}
            <div className="md:col-span-8 rounded-[20px] bg-[#2b4a8b] p-8 flex flex-col text-white overflow-hidden relative shadow-lg shadow-[#2b4a8b]/20 transition-all hover:-translate-y-1 hover:shadow-[#2b4a8b]/40 group">
              <div className="absolute top-0 right-0 p-8 opacity-10 transition-transform duration-700 group-hover:scale-125 group-hover:rotate-12 pointer-events-none">
                <Wallet className="h-32 w-32" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-700/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="relative z-10 flex-grow">
                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center text-white mb-6 backdrop-blur-sm transition-transform group-hover:scale-110">
                  <Wallet className="h-6 w-6" />
                </div>
                <h4 className="font-display text-2xl font-bold mb-3">Honorarium & Billing</h4>
                <p className="text-blue-100 leading-relaxed max-w-lg mb-8">
                  Kalkulasi otomatis biaya tagihan stase Universitas ke Rumah Sakit dan pencairan honorarium langsung ke rekening Preceptor berdasarkan beban verifikasi logbook.
                </p>
              </div>
              <Link href="/login" className="relative z-10 flex items-center gap-2 text-sm font-bold text-white hover:text-blue-100 transition-colors w-max mt-auto group/link">
                Masuk untuk detail finansial <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
              </Link>
            </div>

            {/* Bento 3: Data */}
            <div className="md:col-span-5 bento-card p-8 flex flex-col justify-center text-center group">
              <div className="bento-content">
                <h4 className="font-display text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">Total Entri Logbook</h4>
                <p className="text-sm text-slate-500 uppercase tracking-widest font-semibold mb-4">Tahun Akademik Ini</p>
                <div className="font-display text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#2b4a8b] to-sky-400 transform transition-transform group-hover:scale-105 tabular-nums">
                  {stats ? stats.logbook_entries.toLocaleString("id-ID") : "—"}
                </div>
              </div>
            </div>

            {/* Bento 4: Konsultasi */}
            <div className="md:col-span-7 bento-card p-8 flex flex-col group">
              <div className="bento-content flex flex-col h-full">
                <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-6 transition-transform group-hover:scale-110 group-hover:bg-amber-100">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <h4 className="font-display text-xl font-bold text-slate-900 mb-3 group-hover:text-amber-600 transition-colors">Monitoring Dosen Pembimbing</h4>
                <p className="text-slate-500 text-sm leading-relaxed flex-grow">
                  Setiap entri aktivitas klinis, baik kasus maupun tindakan, dipantau langsung oleh Konsulen. Fitur pesan *feedback* internal memastikan setiap Mahasiswa mendapatkan asuhan akademik berkualitas.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
      )}

      {/* --- Footer (komponen bersama, settings-driven) --- */}
      <div className="relative z-20">
        <LandingFooter accent="blue" icon={Activity} />
      </div>
    </div>
  );
}
