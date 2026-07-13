"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, ShieldAlert, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AcademicEvent {
  id: string;
  title: string;
  event_type: string;
  start_date: string;
  end_date: string;
  description?: string | null;
  blocks_rotation: boolean;
}

interface ReferenceItem {
  id: string;
  name: string;
  value: string;
}

interface EventForm {
  title: string;
  event_type: string;
  start_date: string;
  end_date: string;
  description: string;
  blocks_rotation: boolean;
}

const EMPTY_FORM: EventForm = {
  title: "",
  event_type: "",
  start_date: "",
  end_date: "",
  description: "",
  blocks_rotation: false,
};

const TYPE_COLOR: Record<string, string> = {
  holiday: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  blackout: "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900",
  exam_period: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  academic_activity: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

const DAY_DOT: Record<string, string> = {
  holiday: "bg-red-500",
  blackout: "bg-slate-800 dark:bg-slate-200",
  exam_period: "bg-amber-500",
  academic_activity: "bg-blue-600",
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function AcademicCalendarPage() {
  const t = useTranslations("academicCalendar");
  const tc = useTranslations("common");
  const user = useAuthStore((state) => state.user);
  const canManage = user?.permissions?.includes("manage-academic-master") ?? false;

  const monthName = (m: number) => t(`months.${m}`);
  const dowLabels = Array.from({ length: 7 }, (_, i) => t(`daysOfWeek.${i}`));

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [types, setTypes] = useState<ReferenceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [deleting, setDeleting] = useState<AcademicEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const from = ymd(new Date(year, month, 1));
      const to = ymd(new Date(year, month + 1, 0));
      const res = await api.get("/api/v1/academic/calendar", { params: { from, to } });
      setEvents(res.data.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("loadError")));
    } finally {
      setIsLoading(false);
    }
  }, [year, month, t]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    api
      .get("/api/references/academic_event_types")
      .then((res) => setTypes(res.data.data || []))
      .catch(() => toast.error(t("typeLoadError")));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sekali saat mount
  }, []);

  const typeLabel = (value: string) => types.find((ref) => ref.value === value)?.name || value;

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1);
  };

  // Grid bulan: mulai Senin
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (firstDay.getDay() + 6) % 7; // Minggu(0) → 6
  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const eventsOnDay = (day: number) => {
    const date = ymd(new Date(year, month, day));
    return events.filter(
      (ev) => ev.start_date.slice(0, 10) <= date && ev.end_date.slice(0, 10) >= date
    );
  };

  const openCreate = () => {
    setEditingId(null);
    const base = ymd(new Date(year, month, today.getMonth() === month ? today.getDate() : 1));
    setForm({ ...EMPTY_FORM, start_date: base, end_date: base, event_type: types[0]?.value || "" });
    setIsOpen(true);
  };

  const openEdit = (ev: AcademicEvent) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      event_type: ev.event_type,
      start_date: ev.start_date.slice(0, 10),
      end_date: ev.end_date.slice(0, 10),
      description: ev.description || "",
      blocks_rotation: ev.blocks_rotation,
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/v1/academic/calendar/${editingId}`, form);
        toast.success(t("updated"));
      } else {
        await api.post("/api/v1/academic/calendar", form);
        toast.success(t("created"));
      }
      setIsOpen(false);
      fetchEvents();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("saveError")));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/api/v1/academic/calendar/${deleting.id}`);
      toast.success(t("deleted"));
      fetchEvents();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("deleteError")));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="bg-blue-900 hover:bg-blue-800 text-white">
            <Plus className="w-4 h-4 mr-2" /> {t("addEvent")}
          </Button>
        )}
      </div>

      {/* Navigasi bulan */}
      <div className="flex items-center justify-between rounded-md border bg-white dark:bg-gray-900 px-4 py-3">
        <Button variant="ghost" size="sm" onClick={prevMonth} aria-label={t("prevMonth")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-semibold text-lg">
          {monthName(month)} {year}
        </span>
        <Button variant="ghost" size="sm" onClick={nextMonth} aria-label={t("nextMonth")}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Grid bulan */}
      <div className="rounded-md border bg-white dark:bg-gray-900 p-3 overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[560px]">
          {dowLabels.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide py-2">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            const dayEvents = day ? eventsOnDay(day) : [];
            const isToday =
              day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <div
                key={i}
                className={`min-h-[72px] border border-slate-100 dark:border-slate-800 p-1.5 text-sm ${
                  day ? "" : "bg-slate-50/50 dark:bg-slate-950/50"
                }`}
              >
                {day && (
                  <>
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        isToday ? "bg-blue-900 text-white font-bold" : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div key={ev.id} className="flex items-center gap-1 truncate" title={ev.title}>
                          <span className={`h-1.5 w-1.5 rounded-full flex-none ${DAY_DOT[ev.event_type] || "bg-slate-400"}`} />
                          <span className="truncate text-[11px] text-slate-600 dark:text-slate-300">{ev.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[10px] text-slate-400">{t("moreEvents", { count: dayEvents.length - 2 })}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Daftar event bulan ini */}
      <div className="rounded-md border bg-white dark:bg-gray-900">
        <div className="px-4 py-3 border-b font-semibold text-sm">
          {t("monthEventsHeading", { month: monthName(month), year })}
        </div>
        {isLoading ? (
          <p className="text-center text-slate-500 py-8 text-sm">{tc("loading")}</p>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <CalendarDays className="w-8 h-8 text-slate-300" />
            <p className="text-sm text-slate-500">{t("noEvents")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-center gap-3 px-4 py-3">
                <Badge className={TYPE_COLOR[ev.event_type] || "bg-slate-100 text-slate-600"}>
                  {typeLabel(ev.event_type)}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate flex items-center gap-1.5">
                    {ev.title}
                    {ev.blocks_rotation && (
                      <span title={t("blocksRotationTitle")}>
                        <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t("dateRange", { start: ev.start_date.slice(0, 10), end: ev.end_date.slice(0, 10) })}
                    {ev.description ? ` — ${ev.description}` : ""}
                  </p>
                </div>
                {canManage && (
                  <div className="flex-none">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(ev)} aria-label={tc("edit")}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleting(ev)}
                      aria-label={tc("delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dialog tambah/edit */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t("editEvent") : t("addEventDialog")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("eventTitle")}</label>
              <Input required maxLength={255} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("eventType")}</label>
              <select
                className={selectClass}
                required
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              >
                <option value="">{t("selectType")}</option>
                {types.map((ref) => (
                  <option key={ref.id} value={ref.value}>{ref.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("startDate")}</label>
                <Input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("endDate")}</label>
                <Input type="date" required min={form.start_date} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("descriptionOptional")}</label>
              <textarea
                className="flex min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                maxLength={2000}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer rounded-md border p-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
                checked={form.blocks_rotation}
                onChange={(e) => setForm({ ...form, blocks_rotation: e.target.checked })}
              />
              <span>
                <span className="font-medium">{t("blockRotationLabel")}</span>
                <span className="block text-xs text-muted-foreground">
                  {t("blockRotationDesc")}
                </span>
              </span>
            </label>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? tc("saving") : tc("save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t.rich("deleteConfirm", {
              title: deleting?.title ?? "",
              b: (c) => <span className="font-semibold">{c}</span>,
            })}
            {deleting?.blocks_rotation && ` ${t("deleteBlockSuffix")}`}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>{tc("cancel")}</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
              {tc("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
