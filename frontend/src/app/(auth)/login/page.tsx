import { LoginForm } from "@/components/auth/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Academic Clinical Management System",
  description: "Sign in to your ACMS account to access the Academic Clinical Management System.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left Branded Panel */}
      <div className="login-brand-panel hidden lg:flex lg:w-[55%] xl:w-[58%] relative overflow-hidden flex-col items-center justify-center">
        {/* Animated Background Elements */}
        <div className="login-bg-grid" />
        <div className="login-float-orb login-float-orb--1" />
        <div className="login-float-orb login-float-orb--2" />
        <div className="login-float-orb login-float-orb--3" />
        <div className="login-helix login-helix--1" />
        <div className="login-helix login-helix--2" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center px-12 text-center max-w-lg">
          {/* Logo Mark */}
          <div className="login-logo-mark">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M28 4L28 20M28 36L28 52" stroke="rgba(94,228,208,0.9)" strokeWidth="3" strokeLinecap="round"/>
              <path d="M20 12L36 12" stroke="rgba(94,228,208,0.9)" strokeWidth="3" strokeLinecap="round"/>
              <path d="M20 44L36 44" stroke="rgba(94,228,208,0.5)" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="28" cy="28" r="6" stroke="rgba(94,228,208,0.9)" strokeWidth="2.5" fill="none"/>
              <path d="M14 22C14 22 18 28 28 28C38 28 42 34 42 34" stroke="rgba(94,228,208,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M14 34C14 34 18 28 28 28C38 28 42 22 42 22" stroke="rgba(94,228,208,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>

          <h1 className="mt-8 text-4xl xl:text-5xl font-bold tracking-tight text-white leading-tight">
            Academic Clinical<br />Management System
          </h1>
          <p className="mt-5 text-base xl:text-lg text-slate-300/80 leading-relaxed max-w-md">
            Platform terpadu untuk pengelolaan klinik akademik — jadwal, rekam medis, dan pelaporan dalam satu sistem.
          </p>

          {/* Feature Highlights */}
          <div className="mt-12 flex flex-col gap-4 w-full max-w-sm">
            <div className="login-feature-row">
              <div className="login-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <span className="text-sm text-slate-300/90">Manajemen data pasien & rekam medis</span>
            </div>
            <div className="login-feature-row">
              <div className="login-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <span className="text-sm text-slate-300/90">Penjadwalan klinik & rotasi mahasiswa</span>
            </div>
            <div className="login-feature-row">
              <div className="login-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <span className="text-sm text-slate-300/90">Pelaporan insiden & analitik real-time</span>
            </div>
          </div>
        </div>

        {/* Bottom Attribution */}
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-xs text-slate-400/50 tracking-wide">
            © {new Date().getFullYear()} ACMS &middot; Powered by Academic Clinical Excellence
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white dark:bg-gray-950 px-6 sm:px-10 lg:px-16 relative">
        {/* Mobile header (shown only on small screens) */}
        <div className="lg:hidden mb-10 text-center">
          <div className="login-logo-mark login-logo-mark--mobile mx-auto">
            <svg width="40" height="40" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M28 4L28 20M28 36L28 52" stroke="hsl(174,58%,56%)" strokeWidth="3" strokeLinecap="round"/>
              <path d="M20 12L36 12" stroke="hsl(174,58%,56%)" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="28" cy="28" r="6" stroke="hsl(174,58%,56%)" strokeWidth="2.5" fill="none"/>
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            ACMS
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Academic Clinical Management System
          </p>
        </div>

        <div className="w-full max-w-[420px]">
          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl xl:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Selamat Datang
            </h2>
            <p className="mt-2 text-[15px] text-gray-500 dark:text-gray-400">
              Masuk ke akun Anda untuk melanjutkan
            </p>
          </div>

          <LoginForm />

          {/* Footer */}
          <p className="mt-10 text-center text-xs text-gray-400 dark:text-gray-500">
            Dengan masuk, Anda menyetujui{" "}
            <span className="underline underline-offset-2 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Ketentuan Layanan</span>
            {" "}dan{" "}
            <span className="underline underline-offset-2 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Kebijakan Privasi</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
