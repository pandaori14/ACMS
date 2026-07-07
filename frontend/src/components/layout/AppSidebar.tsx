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
import { Building, BookOpen, Home, Settings, Settings2, LogOut, FileText, Building2, GraduationCap, CalendarSync, ClipboardList, CheckCircle, BarChart2, Users, ShieldAlert, Database, ScrollText, MapPin, MessageSquare, MessageSquareDot, Bell, Bot, LifeBuoy } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function AppSidebar() {
  const t = useTranslations("nav");
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
  // Dodiknis punya menu khusus: dasbor preceptor & honorarium miliknya sendiri
  const isDodiknis = user?.roles?.includes("Dodiknis") ?? false;
  // Admin RS: roster mahasiswa yang dirotasi di RS-nya
  const isAdminRS = user?.roles?.includes("Admin RS") ?? false;

  const navGroups = [
    {
      label: t("groups.main"),
      items: [
        { title: t("dashboard"), url: "/dashboard", icon: Home, permissions: ["view-dashboard"] },
        ...(isDodiknis ? [{ title: t("preceptorDashboard"), url: "/dashboard/preceptor", icon: ClipboardList, permissions: ["view-dashboard"] }] : []),
        { title: t("notifications"), url: "/dashboard/notifications", icon: Bell, permissions: ["view-dashboard"] },
        { title: t("broadcast"), url: "/dashboard/broadcasts", icon: MessageSquareDot, permissions: ["send-broadcasts"] },
        { title: t("analytics"), url: "/dashboard/analytics", icon: BarChart2, permissions: ["view-analytics"] },
        { title: t("executiveDashboard"), url: "/dashboard/analytics/executive", icon: BarChart2, permissions: ["view-executive-analytics"] },
        { title: t("reportCenter"), url: "/dashboard/reports", icon: FileText, permissions: ["view-attendance-recap", "manage-grades", "view-analytics", "manage-incidents", "manage-finance", "view-logbook"] },
        { title: t("helpCenter"), url: "/dashboard/help", icon: LifeBuoy, permissions: ["view-dashboard"] },
      ]
    },
    {
      label: t("groups.academicClinical"),
      items: [
        { title: t("staseManagement"), url: "/dashboard/academic/stase", icon: GraduationCap, permissions: ["manage-stase"] },
        { title: t("hospitals"), url: "/dashboard/rotation/hospitals", icon: Building2, permissions: ["manage-hospitals"] },
        ...(isAdminRS ? [{ title: t("myHospitalStudents"), url: "/dashboard/hospital/students", icon: Users, permissions: ["view-rotations"] }] : []),
        { title: t("rotationSchedule"), url: "/dashboard/rotations", icon: CalendarSync, permissions: ["view-rotations", "manage-rotations"] },
        { title: t("rotationTimeline"), url: "/dashboard/rotations/timeline", icon: CalendarSync, permissions: ["manage-rotations"] },
        { title: t("swapSchedule"), url: "/dashboard/rotations/swap", icon: CalendarSync, permissions: ["view-rotations", "manage-rotations"] },
        { title: t("logbook"), url: "/dashboard/clinical/logbooks", icon: ClipboardList, permissions: ["view-logbook"] },
        { title: t("logbookVerification"), url: "/dashboard/clinical/verification", icon: CheckCircle, permissions: ["verify-logbook"] },
        { title: t("attendance"), url: "/dashboard/clinical/attendance", icon: MapPin, permissions: ["view-logbook"] },
        { title: t("competencyProgress"), url: "/dashboard/clinical/competency-progress", icon: CheckCircle, permissions: ["view-logbook", "verify-logbook", "manage-academic-master"] },
        { title: t("skillChecklist"), url: "/dashboard/clinical/skills", icon: ClipboardList, permissions: ["view-logbook", "create-assessments", "manage-academic-master"] },
        { title: t("attendanceRecap"), url: "/dashboard/clinical/attendance/recap", icon: MapPin, permissions: ["view-attendance-recap"] },
      ]
    },
    {
      label: t("groups.assessmentEvaluation"),
      items: [
        { title: t("exams"), url: "/dashboard/examinations", icon: CheckCircle, permissions: ["take-examinations", "manage-examinations"] },
        { title: t("questionBank"), url: "/dashboard/examinations/question-bank", icon: Database, permissions: ["manage-examinations"] },
        { title: t("ukmppd"), url: "/dashboard/examinations/ukmppd", icon: GraduationCap, permissions: ["take-examinations", "manage-examinations"] },
        { title: t("fillAssessment"), url: "/dashboard/assessments/create", icon: FileText, permissions: ["create-assessments"] },
        { title: t("assessmentHistory"), url: "/dashboard/assessments", icon: BookOpen, permissions: ["view-assessments"] },
        { title: t("gradeRecap"), url: "/dashboard/grades", icon: FileText, permissions: ["manage-grades"] },
        { title: t("gradeAppeals"), url: "/dashboard/grades/appeals", icon: ShieldAlert, permissions: ["manage-grades"] },
        { title: t("transcriptYudisium"), url: "/dashboard/transcripts", icon: BookOpen, permissions: ["view-transcripts"] },
        { title: t("yudisiumEligibility"), url: "/dashboard/transcripts/eligibility", icon: CheckCircle, permissions: ["manage-grades"] },
        { title: t("clinicalTranscript"), url: "/dashboard/my-grades", icon: BookOpen, permissions: ["view-transcripts"] },
        { title: t("officialDocuments"), url: "/dashboard/documents", icon: FileText, permissions: ["view-transcripts"] },
        { title: t("evaluationReport"), url: "/dashboard/clinical/evaluations/report", icon: BarChart2, permissions: ["view-analytics"] },
      ]
    },
    {
      label: t("groups.securityReports"),
      items: [
        { title: canConfigureIncident ? t("incidentConfigure") : t("incidentReport"), url: "/dashboard/incidents/report", icon: canConfigureIncident ? Settings2 : ShieldAlert, permissions: ["report-incidents", "configure-incident-form"] },
        { title: canManageIncidents ? t("incidentList") : t("incidentMine"), url: "/dashboard/incidents", icon: FileText, permissions: ["report-incidents", "manage-incidents"] },
        { title: t("incidentStats"), url: "/dashboard/incidents/statistics", icon: BarChart2, permissions: ["manage-incidents"] },
        { title: t("confidentialConsultation"), url: "/dashboard/incidents/consult", icon: MessageSquare, permissions: ["submit-consultation"] },
        { title: t("consultationManagement"), url: "/dashboard/incidents/consultations", icon: MessageSquareDot, permissions: ["manage-consultations"] },
        { title: t("reportingGuide"), url: "/dashboard/safety/guide", icon: BookOpen, permissions: ["view-incident-guide"] },
      ]
    },
    {
      label: t("groups.finance"),
      items: [
        { title: t("hospitalBilling"), url: "/dashboard/finance/hospitals", icon: Building2, permissions: ["manage-finance"] },
        { title: t("honorarium"), url: "/dashboard/finance/preceptors", icon: FileText, permissions: ["manage-finance"] },
        ...(isDodiknis ? [{ title: t("myHonorarium"), url: "/dashboard/finance/preceptors", icon: FileText, permissions: ["view-dashboard"] }] : []),
      ]
    },
    {
      label: t("groups.systemMasterData"),
      items: [
        { title: t("aiAssistant"), url: "/dashboard/ai-assistant", icon: Bot, permissions: ["manage-settings"] },
        { title: t("userManagement"), url: "/dashboard/users", icon: Users, permissions: ["manage-users"] },
        { title: t("students"), url: "/dashboard/academic/students", icon: GraduationCap, permissions: ["manage-academic-master"] },
        { title: t("cohorts"), url: "/dashboard/academic/cohorts", icon: CalendarSync, permissions: ["manage-academic-master"] },
        { title: t("academicCalendar"), url: "/dashboard/academic/calendar", icon: CalendarSync, permissions: ["manage-academic-master"] },
        { title: t("masterCompetency"), url: "/dashboard/academic/competencies", icon: ClipboardList, permissions: ["manage-academic-master"] },
        { title: t("masterRubric"), url: "/dashboard/rubrics", icon: FileText, permissions: ["manage-academic-master"] },
        { title: t("facultyProgram"), url: "/dashboard/academic/faculty", icon: Building, permissions: ["manage-academic-master"] },
        { title: t("systemSettings"), url: "/dashboard/settings", icon: Settings, permissions: ["manage-settings"] },
        { title: t("rbac"), url: "/dashboard/settings/roles", icon: ShieldAlert, permissions: ["manage-settings"] },
        { title: t("masterReference"), url: "/dashboard/settings/references", icon: Database, permissions: ["manage-settings"] },
        { title: t("auditTrail"), url: "/dashboard/settings/audit-logs", icon: ScrollText, permissions: ["view-audit-logs"] },
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
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
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
                <span>{t("logout")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
