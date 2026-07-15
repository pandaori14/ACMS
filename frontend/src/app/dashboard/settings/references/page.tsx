import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ReferencesClient from "./ReferencesClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settingsReferences");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function SettingsReferencesPage() {
  const t = await getTranslations("settingsReferences");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("pageTitle")}</h1>
        <p className="text-muted-foreground">
          {t("pageSubtitle")}
        </p>
      </div>
      <ReferencesClient />
    </div>
  );
}
