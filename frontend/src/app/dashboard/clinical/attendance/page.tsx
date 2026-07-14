"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { MapPin, Clock, LogIn, LogOut, CheckCircle2, CalendarOff } from "lucide-react";
import api from "@/lib/api";

interface AttendanceStatus {
  rotation?: { id: string; hospital?: { name?: string; radius?: number } };
  can_check_in?: boolean;
  can_check_out?: boolean;
  attendance?: { check_in_time?: string | null; check_out_time?: string | null };
}

export default function AttendancePage() {
  const t = useTranslations("clinicalAttendance");
  const tc = useTranslations("common");
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState("");

  // Pengajuan izin/sakit
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "SICK",
    notes: "",
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLeave(true);
    try {
      const res = await api.post("/api/v1/clinical/attendance/leave", leaveForm);
      toast.success(res.data.message);
      setIsLeaveOpen(false);
      setLeaveForm({ date: new Date().toISOString().slice(0, 10), type: "SICK", notes: "" });
      fetchStatus();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("errSubmitLeave")));
    } finally {
      setSubmittingLeave(false);
    }
  };

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/clinical/attendance/status");
      setStatus(res.data);
    } catch {
      toast.error(t("errLoadStatus"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sekali saat mount
  }, []);

  const getLocation = (): Promise<{lat: number, lng: number}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(t("errGeoUnsupported"));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          () => {
            reject(t("errGeoFailed"));
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    });
  };

  const handleAttendance = async (type: 'check-in' | 'check-out') => {
    setProcessing(true);
    setLocationError("");
    
    try {
      const coords = await getLocation();
      setLocation(coords);
      
      const payload = {
        latitude: coords.lat,
        longitude: coords.lng,
        rotation_assignment_id: status?.rotation?.id
      };
      
      const res = await api.post(`/api/v1/clinical/attendance/${type}`, payload);
      
      toast.success(res.data.message);
      fetchStatus();
    } catch (err) {
      if (typeof err === "string") {
        setLocationError(err);
        toast.error(err);
      } else {
        const e = err as { response?: { data?: { message?: string; distance_meters?: number; radius_meters?: number } } };
        toast.error(e.response?.data?.message || t("failAction", { action: type }));
        if (e.response?.data?.distance_meters) {
          const maxRadius = e.response.data.radius_meters ?? 100;
          setLocationError(t("distanceError", { distance: e.response.data.distance_meters, radius: maxRadius }));
        }
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Clock className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        {status?.rotation && (
          <Button variant="outline" onClick={() => setIsLeaveOpen(true)}>
            <CalendarOff className="h-4 w-4 mr-2" /> {t("requestLeave")}
          </Button>
        )}
      </div>

      {!status?.rotation ? (
        <Card className="border-dashed bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">{t("noRotationTitle")}</h3>
            <p className="text-muted-foreground">{t("noRotationDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <Card className="border-l-4 border-l-primary shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardDescription>{t("currentRotationLocation")}</CardDescription>
                  <CardTitle className="text-xl mt-1">{status.rotation?.hospital?.name}</CardTitle>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary">
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  {t("radiusHint", { radius: status.rotation?.hospital?.radius ?? 100 })}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card className={status.can_check_in ? "border-green-200 bg-green-50/50 dark:bg-green-950/10" : ""}>
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-full ${status.can_check_in ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
                  {status.attendance?.check_in_time ? <CheckCircle2 className="h-8 w-8" /> : <LogIn className="h-8 w-8" />}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{t("checkIn")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {status.attendance?.check_in_time
                      ? t("recordedAt", { time: status.attendance.check_in_time })
                      : t("checkInDesc")}
                  </p>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!status.can_check_in || processing}
                  onClick={() => handleAttendance('check-in')}
                  variant={status.can_check_in ? 'default' : 'secondary'}
                >
                  {processing && status.can_check_in ? t("processingLocation") : t("doCheckIn")}
                </Button>
              </CardContent>
            </Card>

            <Card className={status.can_check_out ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10" : ""}>
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-full ${status.can_check_out ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>
                  {status.attendance?.check_out_time ? <CheckCircle2 className="h-8 w-8" /> : <LogOut className="h-8 w-8" />}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{t("checkOut")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {status.attendance?.check_out_time
                      ? t("recordedAt", { time: status.attendance.check_out_time })
                      : t("checkOutDesc")}
                  </p>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!status.can_check_out || processing}
                  onClick={() => handleAttendance('check-out')}
                  variant={status.can_check_out ? 'default' : 'secondary'}
                >
                  {processing && status.can_check_out ? t("processingLocation") : t("doCheckOut")}
                </Button>
              </CardContent>
            </Card>
          </div>

          {locationError && (
            <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 flex gap-2">
              <MapPin className="h-5 w-5 shrink-0" />
              <p>{locationError}</p>
            </div>
          )}
        </div>
      )}

      {/* Dialog pengajuan izin/sakit */}
      <Dialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("requestLeave")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitLeave} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{tc("date")}</label>
                <Input
                  type="date"
                  required
                  value={leaveForm.date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("type")}</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                >
                  <option value="SICK">{t("sick")}</option>
                  <option value="LEAVE">{t("leave")}</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("reasonLabel")}</label>
              <Textarea
                required
                minLength={5}
                rows={3}
                placeholder={t("reasonPlaceholder")}
                value={leaveForm.notes}
                onChange={(e) => setLeaveForm({ ...leaveForm, notes: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("leaveHint")}
            </p>
            <Button type="submit" className="w-full" disabled={submittingLeave}>
              {submittingLeave ? t("submitting") : t("submitLeave")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
