"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar, ArrowRight, Trash2, Building2, Stethoscope, MapPin } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { useAuthStore } from "@/store/useAuthStore";

interface Program {
  id: string;
  name: string;
}

interface RotationPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  program: Program;
}

interface MyAssignment {
  id: string;
  status: string;
  stase?: { name?: string; duration_weeks?: number } | null;
  hospital?: { name?: string; address?: string | null } | null;
  preceptor?: { name?: string } | null;
  rotation_period?: { name?: string; start_date?: string; end_date?: string } | null;
}

const MY_STATUS_BADGE: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-700",
  remedial: "bg-orange-100 text-orange-700",
};

export default function RotationPeriodsPage() {
  const t = useTranslations("rotationList");
  const user = useAuthStore((state) => state.user);
  const canManage = user?.permissions?.includes("manage-rotations");

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    program_id: "",
    name: "",
    start_date: "",
    end_date: "",
    status: "draft",
  });

  const { data: periodsData, isLoading: loadingPeriods, refetch: refetchPeriods } = useQuery({
    queryKey: ['rotation_periods'],
    queryFn: async (): Promise<RotationPeriod[]> => {
      const res = await api.get("/api/v1/rotation/periods");
      return res.data.data || [];
    },
    enabled: !!canManage,
  });

  // Mahasiswa: jadwal rotasi milik sendiri (backend otomatis membatasi)
  const { data: myAssignmentsData, isLoading: loadingMine } = useQuery({
    queryKey: ['my_rotation_assignments'],
    queryFn: async (): Promise<MyAssignment[]> => {
      const res = await api.get("/api/v1/rotation/assignments");
      return res.data.data || [];
    },
    enabled: !canManage,
  });

  const { data: programsData, isLoading: loadingPrograms } = useQuery({
    queryKey: ['programs'],
    queryFn: async (): Promise<Program[]> => {
      const res = await api.get("/api/v1/academic/programs");
      return res.data.data || [];
    }
  });

  const periods = periodsData || [];
  const programs = programsData || [];
  const loading = loadingPeriods || loadingPrograms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/rotation/periods", formData);
      setIsOpen(false);
      resetForm();
      toast.success(t("saved"));
      refetchPeriods();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("saveError")));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await api.delete(`/api/v1/rotation/periods/${id}`);
      toast.success(t("deleted"));
      refetchPeriods();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("deleteError")));
    }
  };

  const resetForm = () => {
    setFormData({ program_id: "", name: "", start_date: "", end_date: "", status: "draft" });
  };

  // ---------- View MAHASISWA: jadwal rotasi milik sendiri ----------
  if (!canManage) {
    const myAssignments = myAssignmentsData || [];
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("myTitle")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("mySubtitle")}
          </p>
        </div>

        {loadingMine ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
        ) : myAssignments.length === 0 ? (
          <div className="py-16 text-center clean-card border-dashed">
            <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-medium">{t("noPlacementTitle")}</h3>
            <p className="text-muted-foreground mt-2">
              {t("noPlacementDesc")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myAssignments.map((a) => (
              <div key={a.id} className="clean-card p-6 bg-white space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-50 text-blue-700 rounded-lg p-2 inline-flex">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{a.stase?.name || "-"}</h3>
                      <p className="text-xs text-slate-500">
                        {a.rotation_period?.name}
                        {a.stase?.duration_weeks ? ` — ${t("weeks", { count: a.stase.duration_weeks })}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${MY_STATUS_BADGE[a.status] || "bg-slate-100 text-slate-700"}`}>
                    {a.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-slate-600 border-t pt-3">
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">{a.hospital?.name || "-"}</p>
                      {a.hospital?.address && <p className="text-xs text-slate-500">{a.hospital.address}</p>}
                    </div>
                  </div>
                  {a.rotation_period?.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>
                        {new Date(a.rotation_period.start_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                        {" — "}
                        {a.rotation_period.end_date
                          ? new Date(a.rotation_period.end_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                          : "-"}
                      </span>
                    </div>
                  )}
                  {a.preceptor?.name && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>{t("supervisor")}: <span className="font-medium text-slate-900">{a.preceptor.name}</span></span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="h-4 w-4" /> {t("createPeriod")}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("createPeriodTitle")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("program")}</Label>
                <Select value={formData.program_id} onValueChange={(val) => setFormData({ ...formData, program_id: val ?? "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectProgram")} />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("periodName")}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("periodNamePlaceholder")}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("startDate")}</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("endDate")}</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">{t("savePeriod")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))
        ) : periods.length === 0 ? (
          <div className="col-span-full py-12 text-center clean-card border-dashed">
            <h3 className="text-lg font-medium">{t("noPeriodsTitle")}</h3>
            <p className="text-muted-foreground mt-2">{t("noPeriodsDesc")}</p>
          </div>
        ) : (
          periods.map((period) => (
            <div key={period.id} className="group relative clean-card p-6 hover:border-blue-500 hover:shadow-md transition-all bg-white">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 text-blue-700 rounded-lg p-2.5 inline-flex">
                  <Calendar className="h-6 w-6" />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  period.status === 'draft' ? 'bg-slate-100 text-slate-700' :
                  period.status === 'published' ? 'bg-blue-100 text-blue-700' :
                  period.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {period.status.toUpperCase()}
                </span>
              </div>
              
              <h3 className="text-xl font-bold mb-1">{period.name}</h3>
              <p className="text-sm text-slate-500 mb-6">{period.program.name}</p>
              
              <div className="space-y-2 text-sm text-slate-600 mb-6 border-t pt-4">
                <div className="flex justify-between">
                  <span>{t("start")}:</span>
                  <span className="font-medium text-slate-900">{new Date(period.start_date).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("end")}:</span>
                  <span className="font-medium text-slate-900">{new Date(period.end_date).toLocaleDateString('id-ID')}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Link 
                  href={`/dashboard/rotations/${period.id}`}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full group-hover:bg-blue-600"
                >
                  {t("manageSchedule")} <ArrowRight className="h-4 w-4" />
                </Link>
                <Button variant="outline" size="icon" className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => {
                  e.preventDefault();
                  handleDelete(period.id);
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
