import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/layout/UserMenu";
import { TwoFactorBanner } from "@/components/layout/TwoFactorBanner";
import { OnboardingTour } from "@/components/OnboardingTour";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950 pb-20 md:pb-0">
        {/* Mobile Top Header */}
        <div className="flex h-14 items-center justify-between border-b px-4 md:hidden bg-white dark:bg-slate-900 sticky top-0 z-40">
          <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">ACMS</span>
          <div className="flex items-center gap-2">
             <NotificationBell />
             <UserMenu />
          </div>
        </div>

        {/* Desktop Sidebar Trigger */}
        <div className="hidden md:flex h-14 items-center justify-between border-b px-4 bg-white dark:bg-slate-900 sticky top-0 z-40">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
             <NotificationBell />
             <UserMenu />
          </div>
        </div>

        <TwoFactorBanner />
        <OnboardingTour />

        <div className="p-4 md:p-8">
          {children}
        </div>
        
        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </main>
    </SidebarProvider>
  );
}
