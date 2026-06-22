"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { AppSetting } from "@/lib/api-helpers";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Building, BookOpen, Home, Settings, Settings2, LogOut, FileText, Building2, GraduationCap, CalendarSync, ClipboardList, CheckCircle, BarChart2, Users, ShieldAlert, Database, ScrollText, MapPin, MessageSquare, MessageSquareDot, Bell } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export function AppSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logoutAction = useAuthStore((state) => state.logout);
  const router = useRouter();
  const [appSettings, setAppSettings] = useState({ name: 'ACMS', logo: '' });

  useEffect(() => {
    api.get("/api/public-settings").then((res) => {
      const data = res.data;
      const getVal = (key: string) => data.find((s: AppSetting) => s.key === key)?.value;
      setAppSettings({
        name: getVal("app_name") || 'ACMS',
        logo: getVal("app_logo") || ''
      });
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      logoutAction();
      router.push("/login");
    }
  };

  const userRole = user?.roles?.[0] || "";

  // Helper function to check role access
  const hasPermission = (requiredPermissions: string[]) => {
    if (userRole === "Super Admin") return true;
    if (!user?.permissions) return false;
    return requiredPermissions.some(p => user?.permissions?.includes(p));
  };

  // Capability-aware: pemegang configure-incident-form melihat menu insiden
  // sebagai "Konfigurasi Insiden" (CONFIGURE), selain itu sebagai "Lapor Insiden" (OPERATE).
  const canConfigureIncident = userRole === "Super Admin" || (user?.permissions?.includes("configure-incident-form") ?? false);
  const canManageIncidents = userRole === "Super Admin" || (user?.permissions?.includes("manage-incidents") ?? false);

  const navGroups = [
    {
      label: "Utama",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: Home, permissions: ["view-dashboard"] },
        { title: "Notifikasi", url: "/dashboard/notifications", icon: Bell, permissions: ["view-dashboard"] },
        { title: "Analytics & Reports", url: "/dashboard/analytics", icon: BarChart2, permissions: ["view-analytics"] },
      ]
    },
    {
      label: "Akademik & Klinis",
      items: [
        { title: "Manajemen Stase", url: "/dashboard/academic/stase", icon: GraduationCap, permissions: ["manage-stase"] },
        { title: "Rumah Sakit", url: "/dashboard/rotation/hospitals", icon: Building2, permissions: ["manage-hospitals"] },
        { title: "Jadwal Rotasi", url: "/dashboard/rotations", icon: CalendarSync, permissions: ["view-rotations", "manage-rotations"] },
        { title: "Logbook Klinis", url: "/dashboard/clinical/logbooks", icon: ClipboardList, permissions: ["view-logbook"] },
        { title: "Verifikasi Logbook", url: "/dashboard/clinical/verification", icon: CheckCircle, permissions: ["verify-logbook"] },
        { title: "Rekap Presensi", url: "/dashboard/clinical/attendance/recap", icon: MapPin, permissions: ["view-attendance-recap"] },
      ]
    },
    {
      label: "Penilaian & Evaluasi",
      items: [
        { title: "Ujian", url: "/dashboard/examinations", icon: CheckCircle, permissions: ["take-examinations", "manage-examinations"] },
        { title: "Isi Penilaian", url: "/dashboard/assessments/create", icon: FileText, permissions: ["create-assessments"] },
        { title: "Riwayat Penilaian", url: "/dashboard/assessments", icon: BookOpen, permissions: ["view-assessments"] },
        { title: "Rekapitulasi Nilai", url: "/dashboard/grades", icon: FileText, permissions: ["manage-grades"] },
        { title: "Transkrip (Yudisium)", url: "/dashboard/transcripts", icon: BookOpen, permissions: ["view-transcripts"] },
        { title: "Transkrip Klinis", url: "/dashboard/my-grades", icon: BookOpen, permissions: ["view-transcripts"] },
      ]
    },
    {
      label: "Keamanan & Laporan",
      items: [
        { title: canConfigureIncident ? "Konfigurasi Insiden" : "Lapor Insiden", url: "/dashboard/incidents/report", icon: canConfigureIncident ? Settings2 : ShieldAlert, permissions: ["report-incidents", "configure-incident-form"] },
        { title: canManageIncidents ? "Daftar Insiden" : "Laporan Saya", url: "/dashboard/incidents", icon: FileText, permissions: ["report-incidents", "manage-incidents"] },
        { title: "Statistik Insiden", url: "/dashboard/incidents/statistics", icon: BarChart2, permissions: ["manage-incidents"] },
        { title: "Konsultasi Rahasia", url: "/dashboard/incidents/consult", icon: MessageSquare, permissions: ["submit-consultation"] },
        { title: "Manajemen Konsultasi", url: "/dashboard/incidents/consultations", icon: MessageSquareDot, permissions: ["manage-consultations"] },
        { title: "Panduan Pelaporan", url: "/dashboard/safety/guide", icon: BookOpen, permissions: ["view-incident-guide"] },
      ]
    },
    {
      label: "Keuangan",
      items: [
        { title: "Tagihan RS", url: "/dashboard/finance/hospitals", icon: Building2, permissions: ["manage-finance"] },
        { title: "Honorarium", url: "/dashboard/finance/preceptors", icon: FileText, permissions: ["manage-finance"] },
      ]
    },
    {
      label: "Sistem & Master Data",
      items: [
        { title: "Manajemen Pengguna", url: "/dashboard/users", icon: Users, permissions: ["manage-users"] },
        { title: "Master Kompetensi", url: "/dashboard/academic/competencies", icon: ClipboardList, permissions: ["manage-academic-master"] },
        { title: "Master Rubrik", url: "/dashboard/rubrics", icon: FileText, permissions: ["manage-academic-master"] },
        { title: "Fakultas & Prodi", url: "/dashboard/academic/faculty", icon: Building, permissions: ["manage-academic-master"] },
        { title: "Pengaturan Sistem", url: "/dashboard/settings", icon: Settings, permissions: ["manage-settings"] },
        { title: "Hak Akses (RBAC)", url: "/dashboard/settings/roles", icon: ShieldAlert, permissions: ["manage-settings"] },
        { title: "Referensi Master", url: "/dashboard/settings/references", icon: Database, permissions: ["manage-settings"] },
        { title: "Audit Trail", url: "/dashboard/settings/audit-logs", icon: ScrollText, permissions: ["view-audit-logs"] },
      ]
    }
  ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4 flex flex-row items-center gap-3">
        {appSettings.logo ? (
          <img src={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}${appSettings.logo}`} alt="Logo" className="w-8 h-8 object-contain rounded" />
        ) : (
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{appSettings.name}</h2>
          <p className="text-xs text-muted-foreground">Klinik Akademik</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group, index) => {
          const filteredItems = group.items.filter((item) => hasPermission(item.permissions));
          
          if (filteredItems.length === 0) return null;

          return (
            <SidebarGroup key={index}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton render={<Link href={item.url} />} isActive={pathname === item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="flex flex-col space-y-2">
          <div className="text-sm font-medium px-2">{user?.name}</div>
          <div className="text-xs text-muted-foreground px-2 mb-2">{user?.roles?.[0]}</div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} className="text-red-500 hover:text-red-600">
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
