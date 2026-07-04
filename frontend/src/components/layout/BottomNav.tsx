"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Home, CalendarSync, ClipboardList, CheckCircle, Menu, BookOpen, FileText, MapPin } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const userRole = user?.roles?.[0] || "";

  const hasPermission = (requiredPermissions: string[]) => {
    if (userRole === "Super Admin") return true;
    if (!user?.permissions) return false;
    return requiredPermissions.some(p => user?.permissions?.includes(p));
  };

  const navItems = [
    { title: "Beranda", url: "/dashboard", icon: Home, permissions: ["view-dashboard"] },
    { title: "Rotasi", url: "/dashboard/rotations", icon: CalendarSync, permissions: ["view-rotations", "manage-rotations"] },
    { title: "Logbook", url: "/dashboard/clinical/logbooks", icon: ClipboardList, permissions: ["view-logbook"] },
    { title: "Presensi", url: "/dashboard/clinical/attendance", icon: MapPin, permissions: ["view-logbook"] },
    { title: "Verifikasi", url: "/dashboard/clinical/verification", icon: CheckCircle, permissions: ["verify-logbook"] },
    { title: "Penilaian", url: "/dashboard/assessments/create", icon: FileText, permissions: ["create-assessments"] },
    { title: "Ujian", url: "/dashboard/examinations", icon: CheckCircle, permissions: ["take-examinations", "manage-examinations"] },
    { title: "Transkrip", url: "/dashboard/my-grades", icon: BookOpen, permissions: ["view-transcripts"] },
    { title: "Panduan", url: "/dashboard/safety/guide", icon: BookOpen, permissions: ["view-incident-guide"] },
    // "Lainnya" should ideally open a sidebar or show an overflow menu, 
    // but for now we just show it if they have Dashboard access as a fallback.
    { title: "Lainnya", url: "#", icon: Menu, permissions: ["view-dashboard"] },
  ];

  const filteredNavItems = navItems.filter((item) => hasPermission(item.permissions)).slice(0, 5); // Max 5 items for bottom nav

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t pb-safe md:hidden">
      <div className="flex justify-around items-center h-16">
        {filteredNavItems.map((item, index) => {
          const isActive = pathname === item.url;
          return (
            <Link 
              key={index} 
              href={item.url}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "fill-blue-50 stroke-blue-600" : ""}`} />
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
