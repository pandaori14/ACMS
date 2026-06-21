"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check, ChevronLeft, ChevronRight, CheckCheck, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import api from "@/lib/api";
import { toast } from "sonner";

interface AppNotification {
  id: string;
  data: { title: string; message: string; url?: string; type?: string };
  read_at: string | null;
  created_at: string;
}

function typeIcon(type?: string) {
  switch (type) {
    case "warning": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case "success": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    default: return <Info className="h-5 w-5 text-blue-500" />;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async (p: number) => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/notifications", { params: { page: p } });
      setNotifications(res.data.notifications.data ?? []);
      setLastPage(res.data.notifications.last_page ?? 1);
      setUnreadCount(res.data.unread_count ?? 0);
    } catch {
      toast.error("Gagal memuat notifikasi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(page);
  }, [fetchNotifications, page]);

  const markAsRead = async (n: AppNotification) => {
    try {
      if (!n.read_at) {
        await api.post(`/api/v1/notifications/${n.id}/read`);
        fetchNotifications(page);
      }
      if (n.data.url) router.push(n.data.url);
    } catch {
      toast.error("Gagal memperbarui notifikasi");
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post("/api/v1/notifications/mark-all-read");
      toast.success("Semua notifikasi ditandai sudah dibaca");
      fetchNotifications(page);
    } catch {
      toast.error("Gagal menandai notifikasi");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-7 w-7" />
            Notifikasi
            {unreadCount > 0 && (
              <span className="ml-1 inline-flex items-center rounded-full bg-red-600 text-white text-xs font-semibold px-2 py-0.5">
                {unreadCount} baru
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Riwayat pemberitahuan terkait laporan insiden, konsultasi, dan aktivitas sistem lainnya.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" /> Tandai Semua Dibaca
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Memuat notifikasi...</div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Belum ada notifikasi.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => markAsRead(n)}
                className={`w-full text-left flex items-start gap-3 p-4 transition-colors hover:bg-muted/40 ${!n.read_at ? "bg-blue-50/50 dark:bg-blue-950/10" : ""}`}
              >
                <div className="mt-0.5 shrink-0">{typeIcon(n.data.type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${!n.read_at ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"}`}>
                      {n.data.title}
                    </p>
                    {!n.read_at && <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.data.message}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1.5">
                    {format(new Date(n.created_at), "dd MMM yyyy, HH:mm")}
                    {n.data.url ? " · Klik untuk membuka" : ""}
                  </p>
                </div>
                {n.read_at && <Check className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-1" />}
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {lastPage > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">Halaman {page} dari {lastPage}</span>
          <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>
            Berikutnya <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
