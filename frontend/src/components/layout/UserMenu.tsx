"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle, LogOut } from "lucide-react";

/**
 * Dropdown akun di header dashboard: nama+peran, Profil Saya, Keluar.
 */
export function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const logoutAction = useAuthStore((state) => state.logout);
  const router = useRouter();

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

  const initial = user?.name?.charAt(0)?.toUpperCase() || "A";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xs hover:bg-blue-800 transition-colors outline-none"
        aria-label="Menu akun"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="font-medium truncate">{user?.name || "Pengguna"}</p>
          <p className="text-xs text-muted-foreground font-normal truncate">
            {user?.roles?.[0] || ""}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
          <UserCircle className="w-4 h-4 mr-2" /> Profil Saya
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-700">
          <LogOut className="w-4 h-4 mr-2" /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
