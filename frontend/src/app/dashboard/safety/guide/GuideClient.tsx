"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, BookOpen } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import ReactMarkdown from "react-markdown";

export function GuideClient() {
  const [guideContent, setGuideContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.roles?.[0] || "";

  useEffect(() => {
    if (userRole) {
      fetchGuide();
    }
  }, [userRole]);

  const fetchGuide = async () => {
    try {
      const { data } = await api.get("/api/public-settings");
      
      // Determine the setting key based on the role
      const roleKey = userRole.toLowerCase().replace(/\s+/g, '_');
      const settingKey = `incident_guide_${roleKey}`;
      
      const guide = data.find((s: any) => s.key === settingKey)?.value;
      
      if (guide) {
        setGuideContent(guide);
      } else {
        setGuideContent("### Panduan Belum Tersedia\n\nMaaf, panduan pelaporan untuk peran Anda belum dikonfigurasi oleh Super Admin.");
      }
    } catch (err) {
      console.error(err);
      setGuideContent("### Gagal Memuat Panduan\n\nTerjadi kesalahan saat mengambil panduan pelaporan.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panduan Pelaporan Insiden</h1>
          <p className="text-sm text-muted-foreground">Petunjuk resmi yang disesuaikan untuk peran Anda ({userRole})</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="prose prose-blue dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-blue-600">
            <ReactMarkdown>{guideContent}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
