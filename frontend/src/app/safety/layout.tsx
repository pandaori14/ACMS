"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ShieldCheck, ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { AppSetting } from "@/lib/api-helpers";
import LandingFooter from "@/components/landing/LandingFooter";

export default function SafetyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("safetyPublic");
  const [mounted, setMounted] = useState(false);
  const [landingConfig, setLandingConfig] = useState({
    appName: "ACMS Safety",
    appLogo: "",
    hotline: "119",
    footerText: "© 2026 ACMS Safety & Compliance. Kerahasiaan Anda Dijamin.",
  });

  useEffect(() => {
    setMounted(true);
    api.get("/api/public-settings").then((res) => {
      const data = res.data;
      const getVal = (key: string) => data.find((s: AppSetting) => s.key === key)?.value;
      
      let hotlineDisplay = "119";
      const contactsStr = getVal("incident_emergency_contacts");
      if (contactsStr) {
        try {
          const contacts = JSON.parse(contactsStr);
          if (contacts.length > 0) hotlineDisplay = contacts[0].phone;
        } catch (e) {}
      }

      setLandingConfig(prev => ({
        ...prev,
        appName: getVal("app_name") ? `${getVal("app_name")} Safety` : prev.appName,
        appLogo: getVal("app_logo") || prev.appLogo,
        hotline: hotlineDisplay,
        footerText: getVal("footer_text") || prev.footerText,
      }));
    }).catch(console.error);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-red-200 flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mr-4">
              <ChevronLeft className="h-5 w-5" />
              <span className="font-medium text-sm hidden sm:inline">{t("navBack")}</span>
            </Link>
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            {landingConfig.appLogo ? (
              <img src={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}${landingConfig.appLogo}`} alt="Logo" className="h-8 w-auto rounded object-contain ml-4 sm:ml-0" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm ml-4 sm:ml-0">
                <ShieldAlert className="h-4 w-4" />
              </div>
            )}
            <div>
              <span className="block font-bold text-sm leading-none text-slate-900 tracking-tight">{landingConfig.appName}</span>
              <span className="block text-[9px] font-bold tracking-widest text-red-600 uppercase mt-0.5">{t("navReportBadge")}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button className="rounded-full shadow-sm bg-red-600 hover:bg-red-700 h-9 px-5 font-semibold text-xs">
                {t("navCreateReport")}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-24 pb-16">
        {children}
      </main>

      <LandingFooter accent="red" icon={ShieldCheck} className="mt-auto" />
    </div>
  );
}
