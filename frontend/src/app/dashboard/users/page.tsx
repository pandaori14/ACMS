import { getTranslations } from "next-intl/server";
import { UsersClient } from "./UsersClient";

export default async function UsersPage() {
  const t = await getTranslations("settingsUsers");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("pageTitle")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("pageSubtitle")}
        </p>
      </div>

      <UsersClient />
    </div>
  );
}
