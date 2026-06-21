"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import AcmsLandingPage from "@/components/landing/AcmsLandingPage";
import IncidentLandingPage from "@/components/landing/IncidentLandingPage";

export default function Home() {
  const [template, setTemplate] = useState("acms_default");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/public-settings").then((res) => {
      const data = res.data;
      const tpl = data.find((s: any) => s.key === "landing_page_template")?.value;
      if (tpl) setTemplate(tpl);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (template === "incident_reporting") {
    return <IncidentLandingPage />;
  }

  return <AcmsLandingPage />;
}
