import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RoleAccessClient } from "./RoleAccessClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settingsRoles");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default function RolesSettingsPage() {
  return <RoleAccessClient />;
}
