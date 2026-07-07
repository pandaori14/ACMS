"use client";

import { useState, useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { getEcho } from "@/lib/echo";

interface Notification {
  id: string;
  data: {
    title: string;
    message: string;
    url?: string;
    type?: string;
  };
  read_at: string | null;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const userId = useAuthStore((state) => state.user?.id);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/api/v1/notifications");
      setNotifications(res.data.notifications.data);
      setUnreadCount(res.data.unread_count);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  // Polling 60 dtk — fallback yang SELALU jalan (walau Reverb mati/tak dikonfigurasi).
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Realtime (opsional): dengar channel privat user; tiap notifikasi baru →
  // refetch + toast tanpa tunggu polling. Diam-diam nonaktif bila Echo null.
  useEffect(() => {
    if (!userId) return;
    const echo = getEcho();
    if (!echo) return;

    const channelName = `App.Models.User.${userId}`;
    echo
      .private(channelName)
      .listen(".notification", (payload: { title?: string; message?: string }) => {
        fetchNotifications();
        toast(payload?.title || "Notifikasi baru", { description: payload?.message });
      });

    return () => {
      echo.leave(channelName);
    };
  }, [userId]);

  const markAsRead = async (id: string, url?: string) => {
    try {
      await api.post(`/api/v1/notifications/${id}/read`);
      fetchNotifications();
      if (url) {
        router.push(url);
      }
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post("/api/v1/notifications/mark-all-read");
      fetchNotifications();
      toast.success("Semua notifikasi ditandai sudah dibaca");
    } catch (err) {
      toast.error("Gagal menandai notifikasi");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative outline-none")}>
        <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifikasi</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-1 text-xs" onClick={markAllAsRead}>
              <Check className="mr-1 h-3 w-3" /> Tandai Semua Dibaca
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Tidak ada notifikasi
            </div>
          ) : (
            notifications.map((notif) => (
              <DropdownMenuItem 
                key={notif.id} 
                className={`flex flex-col items-start p-3 cursor-pointer ${!notif.read_at ? 'bg-primary/5' : ''}`}
                onClick={() => markAsRead(notif.id, notif.data.url)}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className={`font-medium text-sm ${!notif.read_at ? 'text-primary' : ''}`}>
                    {notif.data.title}
                  </span>
                  {!notif.read_at && (
                    <span className="flex h-2 w-2 rounded-full bg-primary mt-1 shrink-0" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {notif.data.message}
                </span>
                <span className="text-[10px] text-muted-foreground/70 mt-2">
                  {new Date(notif.created_at).toLocaleString('id-ID')}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
