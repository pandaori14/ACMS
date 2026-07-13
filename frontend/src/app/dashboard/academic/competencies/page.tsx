import { getTranslations } from "next-intl/server";
import { CompetenciesClient } from "./CompetenciesClient";

export default async function CompetenciesPage() {
  const t = await getTranslations("academicCompetencies");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("pageTitle")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("pageSubtitle")}
        </p>
      </div>

      <CompetenciesClient />
    </div>
  );
}
