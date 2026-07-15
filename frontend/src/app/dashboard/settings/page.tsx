import { getTranslations } from "next-intl/server";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const t = await getTranslations("settingsMain");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("pageTitle")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("pageSubtitle")}
        </p>
      </div>

      <SettingsClient />
    </div>
  );
}
