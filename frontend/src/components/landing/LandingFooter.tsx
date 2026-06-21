"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldCheck, Phone, Mail, type LucideIcon } from "lucide-react";
import api from "@/lib/api";

interface FooterLink {
  label: string;
  url: string;
}

interface FooterConfig {
  appName: string;
  appLogo: string;
  tagline: string;
  footerText: string;
  phone: string;
  email: string;
  links: FooterLink[];
}

const ACCENTS = {
  blue: "bg-blue-600",
  red: "bg-red-600",
} as const;

interface LandingFooterProps {
  /** Aksen warna kotak logo agar tiap template menjaga identitasnya. */
  accent?: keyof typeof ACCENTS;
  /** Ikon brand bila logo aplikasi belum diunggah. */
  icon?: LucideIcon;
  className?: string;
}

/**
 * Footer landing page bersama — struktur & sumber data identik di semua template,
 * sepenuhnya digerakkan oleh Pengaturan Sistem (grup Umum):
 * app_name, app_logo, footer_tagline, footer_links, footer_text, company_phone, support_email.
 */
export default function LandingFooter({ accent = "blue", icon: Icon = ShieldCheck, className = "" }: LandingFooterProps) {
  const [config, setConfig] = useState<FooterConfig>({
    appName: "ACMS",
    appLogo: "",
    tagline: "Platform Akademik & Klinis Terpadu",
    footerText: "© 2026 ACMS - Hak Cipta Dilindungi.",
    phone: "",
    email: "",
    links: [],
  });

  useEffect(() => {
    api.get("/api/public-settings").then((res) => {
      const data: { key: string; value: string }[] = res.data;
      const getVal = (key: string) => data.find((s) => s.key === key)?.value;

      let links: FooterLink[] = [];
      const linksRaw = getVal("footer_links");
      if (linksRaw) {
        try {
          const parsed = JSON.parse(linksRaw) as FooterLink[];
          links = parsed.filter((l) => l.label && l.url);
        } catch {
          // abaikan JSON tidak valid
        }
      }

      setConfig((prev) => ({
        appName: getVal("app_name") || prev.appName,
        appLogo: getVal("app_logo") || prev.appLogo,
        tagline: getVal("footer_tagline") || prev.tagline,
        footerText: getVal("footer_text") || prev.footerText,
        phone: getVal("company_phone") || "",
        email: getVal("support_email") || "",
        links,
      }));
    }).catch(() => {});
  }, []);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  return (
    <footer className={`border-t border-slate-800 bg-slate-900 pt-12 pb-8 text-slate-300 ${className}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            {config.appLogo ? (
              <img src={`${backendUrl}${config.appLogo}`} alt="Logo" className="h-10 w-auto rounded object-contain" />
            ) : (
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${ACCENTS[accent]}`}>
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div>
              <span className="block font-bold text-lg leading-none text-white">{config.appName}</span>
              <span className="block text-xs font-medium text-slate-400 mt-1">{config.tagline}</span>
            </div>
          </div>

          {/* Links */}
          {config.links.length > 0 && (
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium">
              {config.links.map((link, i) => (
                <Link key={i} href={link.url} className="hover:text-white transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {/* Bottom row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500 border-t border-slate-800 pt-8">
          <p>{config.footerText}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {config.phone && (
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> {config.phone}
              </span>
            )}
            {config.email && (
              <a href={`mailto:${config.email}`} className="flex items-center gap-2 hover:text-slate-300 transition-colors">
                <Mail className="h-4 w-4" /> {config.email}
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
