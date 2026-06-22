"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { AppSetting } from "@/lib/api-helpers";
import ReactMarkdown from "react-markdown";
import { Loader2, ShieldCheck } from "lucide-react";

export default function ProtectionPage() {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/public-settings").then((res) => {
      const data = res.data;
      const val = data.find((s: AppSetting) => s.key === "incident_witness_protection_content")?.value;
      setContent(val || "### Dokumen Kebijakan Belum Tersedia");
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6">
      <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Perlindungan Saksi & Pelapor</h1>
            <p className="text-slate-500 text-sm">Kebijakan Whistleblower dan kerahasiaan</p>
          </div>
        </div>
        
        <article className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-red-600 hover:prose-a:text-red-700">
          <ReactMarkdown>{content || ""}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
