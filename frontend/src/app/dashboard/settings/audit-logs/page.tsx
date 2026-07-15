import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AuditLogsClient from "./AuditLogsClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settingsAuditLogs");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function AuditLogsPage() {
  const t = await getTranslations("settingsAuditLogs");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>
      <AuditLogsClient />
    </div>
  );
}
