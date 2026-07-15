import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuideClient } from "./GuideClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("incidentGuide");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default function GuidePage() {
  return <GuideClient />;
}
