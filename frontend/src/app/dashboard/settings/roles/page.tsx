import { Metadata } from "next";
import { RoleAccessClient } from "./RoleAccessClient";

export const metadata: Metadata = {
  title: "Manajemen Akses Modul | ACMS",
  description: "Atur hak akses setiap peran terhadap modul aplikasi",
};

export default function RolesSettingsPage() {
  return <RoleAccessClient />;
}
