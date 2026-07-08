"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { AppSetting } from "@/lib/api-helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, LifeBuoy } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import ReactMarkdown from "react-markdown";

/**
 * Pusat Bantuan — konten markdown settings-driven (group `help`).
 * Menampilkan panduan sesuai peran + bagian umum. Super Admin mengedit
 * kontennya via Settings → Pusat Bantuan.
 */
export default function HelpCenterPage() {
  const t = useTranslations("helpPage");
  const [roleContent, setRoleContent] = useState<string>("");
  const [generalContent, setGeneralContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.roles?.[0] || "";

  useEffect(() => {
    if (!userRole) return;

    const fetchHelp = async () => {
      try {
        const { data } = await api.get("/api/public-settings");
        const get = (key: string) =>
          data.find((s: AppSetting) => s.key === key)?.value || "";

        // Peta peran → konten: mahasiswa & dodiknis punya panduan khusus,
        // peran lain (SA/Admin Prodi/Kaprodi/Admin RS/Finance/Dosen) pakai admin.
        const roleKey = userRole === "Mahasiswa"
          ? "help_center_mahasiswa"
          : userRole === "Dodiknis"
            ? "help_center_dodiknis"
            : "help_center_admin";

        setRoleContent(get(roleKey));
        setGeneralContent(get("help_center_umum"));
      } catch (err) {
        console.error(err);
        setGeneralContent(t("loadError"));
      } finally {
        setLoading(false);
      }
    };

    fetchHelp();
  }, [userRole, t]);

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
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle", { role: userRole })}
          </p>
        </div>
      </div>

      {roleContent && (
        <Card>
          <CardContent className="p-8">
            <div className="prose prose-blue dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-blue-600">
              <ReactMarkdown>{roleContent}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {generalContent && (
        <Card>
          <CardContent className="p-8">
            <div className="prose prose-blue dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-blue-600">
              <ReactMarkdown>{generalContent}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {!roleContent && !generalContent && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {t("notConfigured")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
