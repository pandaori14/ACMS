"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCircle, HospitalIcon, AlertCircle, Wand2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Stase {
  id: string;
  name: string;
}

interface Hospital {
  id: string;
  name: string;
  code: string;
}

interface Student {
  id: string;
  user: {
    name: string;
    email: string;
  };
}

interface Assignment {
  id: string;
  student_id: string;
  hospital_id: string;
  stase_id: string;
  student: Student;
}

interface Capacity {
  id: string;
  hospital_id: string;
  stase_id: string;
  rotation_period_id?: string | null;
  max_students: number;
  occupied: number;
}

interface CohortOption {
  id: string;
  name?: string;
}

interface SchedulePlacement {
  student_id: string;
  student_name?: string | null;
  identity_number?: string | null;
  stase_id: string;
  stase_name?: string | null;
  hospital_id: string;
  hospital_name?: string | null;
}

interface ScheduleUnplaced {
  student_id: string;
  name?: string | null;
  reason: string;
}

interface SchedulePreviewResult {
  placements: SchedulePlacement[];
  unplaced: ScheduleUnplaced[];
  summary: { candidates: number; placed: number };
}

export default function RotationScheduler({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("rotationDetail");
  const resolvedParams = use(params);
  const periodId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [stases, setStases] = useState<Stase[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedStase, setSelectedStase] = useState<string>("");
  
  // Data State
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [capacities, setCapacities] = useState<Capacity[]>([]);

  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- muat ulang hanya saat periodId berubah
  }, [periodId]);

  useEffect(() => {
    if (selectedStase) {
      fetchAssignments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- muat ulang hanya saat selectedStase berubah
  }, [selectedStase]);

  const fetchInitialData = async () => {
    try {
      const [staseRes, hospRes, unassignedRes] = await Promise.all([
        api.get("/api/v1/academic/stase"),
        api.get("/api/v1/rotation/hospitals"),
        api.get(`/api/v1/academic/students?unassigned_in_period=${periodId}`),
      ]);
      setStases(staseRes.data.data);
      setHospitals(hospRes.data.data);
      setUnassignedStudents(unassignedRes.data.data);
      
      if (staseRes.data.data.length > 0) {
        setSelectedStase(staseRes.data.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const [assignRes, capRes] = await Promise.all([
        api.get(`/api/v1/rotation/assignments?rotation_period_id=${periodId}&stase_id=${selectedStase}`),
        api.get(`/api/v1/rotation/capacities?stase_id=${selectedStase}`),
      ]);
      setAssignments(assignRes.data.data);
      setCapacities(capRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Kuota untuk RS pada stase terpilih (baris spesifik periode menang)
  const getCapacityForHospital = (hospitalId: string): Capacity | undefined => {
    const rows = capacities.filter((c) => c.hospital_id === hospitalId);
    return rows.find((c) => c.rotation_period_id === periodId) || rows.find((c) => !c.rotation_period_id);
  };

  // ---------- Auto-scheduling (round-robin) ----------
  const [isAutoOpen, setIsAutoOpen] = useState(false);
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [autoCohort, setAutoCohort] = useState("");
  const [previewResult, setPreviewResult] = useState<SchedulePreviewResult | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const openAutoSchedule = async () => {
    setPreviewResult(null);
    setAutoCohort("");
    setIsAutoOpen(true);
    try {
      const res = await api.get("/api/v1/academic/cohorts");
      setCohorts(res.data.data || []);
    } catch {
      setCohorts([]);
    }
  };

  const runPreview = async () => {
    setIsPreviewing(true);
    setPreviewResult(null);
    try {
      const res = await api.post("/api/v1/rotation/schedule/preview", {
        rotation_period_id: periodId,
        cohort_id: autoCohort || null,
      });
      setPreviewResult(res.data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("previewError")));
    } finally {
      setIsPreviewing(false);
    }
  };

  const commitSchedule = async () => {
    if (!previewResult || previewResult.placements.length === 0) return;
    setIsCommitting(true);
    try {
      const res = await api.post("/api/v1/rotation/schedule/commit", {
        rotation_period_id: periodId,
        placements: previewResult.placements.map((p) => ({
          student_id: p.student_id,
          stase_id: p.stase_id,
          hospital_id: p.hospital_id,
        })),
      });
      toast.success(res.data.message);
      setIsAutoOpen(false);
      fetchInitialData();
      fetchAssignments();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("commitError")));
    } finally {
      setIsCommitting(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId) return; // No reordering in same column for now

    const studentId = draggableId;
    const fromCol = source.droppableId;
    const toCol = destination.droppableId;

    try {
      if (fromCol === "unassigned") {
        // Assigning new student to a hospital
        const hospitalId = toCol;
        
        // Optimistic UI Update
        const student = unassignedStudents.find((s) => s.id === studentId);
        if (student) {
          setUnassignedStudents((prev) => prev.filter((s) => s.id !== studentId));
          setAssignments((prev) => [...prev, {
            id: 'temp-' + Date.now(),
            student_id: studentId,
            hospital_id: hospitalId,
            stase_id: selectedStase,
            student: student
          }]);
        }

        await api.post("/api/v1/rotation/assignments", {
          rotation_period_id: periodId,
          student_id: studentId,
          stase_id: selectedStase,
          hospital_id: hospitalId,
          status: "pending",
        });

      } else if (toCol === "unassigned") {
        // Removing student from hospital (Unassigning)
        const assignment = assignments.find((a) => a.student_id === studentId);
        if (assignment && !assignment.id.startsWith('temp-')) {
          // Optimistic UI Update
          setAssignments((prev) => prev.filter((a) => a.student_id !== studentId));
          setUnassignedStudents((prev) => [...prev, assignment.student]);
          
          await api.delete(`/api/v1/rotation/assignments/${assignment.id}`);
        }
      } else {
        // Moving from one hospital to another
        const assignment = assignments.find((a) => a.student_id === studentId);
        if (assignment && !assignment.id.startsWith('temp-')) {
          // Optimistic UI Update
          setAssignments((prev) => prev.map((a) => 
            a.student_id === studentId ? { ...a, hospital_id: toCol } : a
          ));

          await api.put(`/api/v1/rotation/assignments/${assignment.id}`, {
            hospital_id: toCol,
            stase_id: selectedStase,
            status: "pending"
          });
        }
      }
      
      // Refresh to get real DB IDs
      fetchInitialData();
      fetchAssignments();
      
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, t("moveError")));
      // Revert Optimistic updates
      fetchInitialData();
      fetchAssignments();
    }
  };

  // Helper to group assignments by hospital
  const getStudentsForHospital = (hospitalId: string) => {
    return assignments.filter((a) => a.hospital_id === hospitalId).map(a => a.student);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={openAutoSchedule} className="gap-2 bg-blue-900 hover:bg-blue-800 text-white">
            <Wand2 className="h-4 w-4" /> {t("autoSchedule")}
          </Button>
          <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border">
            <span className="text-sm font-medium pl-2">{t("filterStase")}</span>
            <Select value={selectedStase} onValueChange={(v) => setSelectedStase(v ?? "")}>
              <SelectTrigger className="w-[250px] border-none shadow-none">
                <SelectValue placeholder={t("selectStase")} />
              </SelectTrigger>
              <SelectContent>
                {stases.map((stase) => (
                  <SelectItem key={stase.id} value={stase.id}>{stase.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("activeModeTitle")}</AlertTitle>
        <AlertDescription>
          {t("activeModeDesc")}
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="flex gap-6 flex-1 min-h-0">
          <Skeleton className="w-80 h-full rounded-xl" />
          <div className="flex-1 flex gap-4 overflow-x-auto">
            <Skeleton className="w-80 h-full rounded-xl shrink-0" />
            <Skeleton className="w-80 h-full rounded-xl shrink-0" />
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
            {/* Unassigned Column */}
            <div className="w-80 shrink-0 flex flex-col bg-slate-50 clean-card overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-100 border-b flex justify-between items-center">
                <h3 className="font-semibold text-slate-700">Belum Dijadwalkan</h3>
                <span className="bg-slate-200 text-slate-700 text-xs px-2 py-1 rounded-full font-medium">
                  {unassignedStudents.length}
                </span>
              </div>
              <Droppable droppableId="unassigned">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-4 overflow-y-auto ${snapshot.isDraggingOver ? "bg-blue-50" : ""}`}
                  >
                    {unassignedStudents.map((student, index) => (
                      <Draggable key={student.id} draggableId={student.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-3 p-3 bg-white border rounded-lg shadow-sm flex items-center gap-3 ${
                              snapshot.isDragging ? "ring-2 ring-blue-500 shadow-lg scale-105" : "hover:border-blue-300"
                            }`}
                          >
                            <UserCircle className="h-8 w-8 text-slate-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{student.user.name}</p>
                              <p className="text-xs text-slate-500 truncate">{student.user.email}</p>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Hospitals Grid */}
            <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
              {hospitals.map((hospital) => {
                const students = getStudentsForHospital(hospital.id);
                const capacity = getCapacityForHospital(hospital.id);
                const isFull = capacity ? students.length >= capacity.max_students : false;
                return (
                  <div key={hospital.id} className="w-80 shrink-0 flex flex-col bg-white clean-card overflow-hidden shadow-sm">
                    <div className="p-4 border-b flex flex-col gap-2 relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 opacity-5">
                        <HospitalIcon className="w-24 h-24" />
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {hospital.code}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            isFull
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                          title={capacity ? "Terisi / kuota maksimal" : "Kuota belum diatur"}
                        >
                          {capacity ? `${students.length}/${capacity.max_students}` : students.length}
                          {isFull ? " • PENUH" : ""}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-800 leading-tight pr-4">{hospital.name}</h3>
                    </div>

                    <Droppable droppableId={hospital.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 p-4 overflow-y-auto transition-colors ${
                            snapshot.isDraggingOver ? "bg-green-50 ring-inset ring-2 ring-green-500/20" : "bg-slate-50/50"
                          }`}
                        >
                          {students.map((student, index) => (
                            <Draggable key={student.id} draggableId={student.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`mb-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center gap-3 ${
                                    snapshot.isDragging ? "ring-2 ring-blue-500 shadow-lg scale-105" : "hover:border-slate-300"
                                  }`}
                                >
                                  <UserCircle className="h-8 w-8 text-blue-400 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">{student.user.name}</p>
                                    <p className="text-xs text-slate-400 truncate">{student.user.email}</p>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {students.length === 0 && !snapshot.isDraggingOver && (
                            <div className="h-full flex items-center justify-center text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                              Tarik mahasiswa ke sini
                            </div>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </div>
        </DragDropContext>
      )}

      {/* Dialog auto-scheduling */}
      <Dialog open={isAutoOpen} onOpenChange={setIsAutoOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Jadwalkan Otomatis (Round-Robin)</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Mahasiswa yang belum ditempatkan pada periode ini akan didistribusikan merata ke semua
            stase &amp; RS — menghormati kuota, dan tidak mengulang stase yang sudah pernah dijalani.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">Filter Angkatan (opsional)</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={autoCohort}
                onChange={(e) => setAutoCohort(e.target.value)}
              >
                <option value="">Semua angkatan</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <Button onClick={runPreview} disabled={isPreviewing} variant="outline">
              {isPreviewing ? "Menghitung..." : "Preview Jadwal"}
            </Button>
          </div>

          {previewResult && (
            <div className="space-y-4">
              <div className="flex gap-2 text-sm">
                <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-medium">
                  {previewResult.summary.placed} tertempatkan
                </span>
                <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 font-medium">
                  {previewResult.unplaced.length} tidak tertempatkan
                </span>
                <span className="px-2 py-1 rounded bg-slate-100 text-slate-600">
                  dari {previewResult.summary.candidates} kandidat
                </span>
              </div>

              {previewResult.placements.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                        <tr className="text-left text-xs text-muted-foreground">
                          <th className="px-3 py-2">Mahasiswa</th>
                          <th className="px-3 py-2">Stase</th>
                          <th className="px-3 py-2">Rumah Sakit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {previewResult.placements.map((p) => (
                          <tr key={p.student_id}>
                            <td className="px-3 py-2">
                              <p className="font-medium">{p.student_name}</p>
                              <p className="text-xs text-muted-foreground">{p.identity_number}</p>
                            </td>
                            <td className="px-3 py-2">{p.stase_name}</td>
                            <td className="px-3 py-2">{p.hospital_name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {previewResult.unplaced.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                    Tidak tertempatkan:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-amber-700 dark:text-amber-300 space-y-0.5 max-h-28 overflow-y-auto">
                    {previewResult.unplaced.map((u) => (
                      <li key={u.student_id}>{u.name} — {u.reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button
                className="w-full bg-blue-900 hover:bg-blue-800 text-white"
                disabled={isCommitting || previewResult.placements.length === 0}
                onClick={commitSchedule}
              >
                {isCommitting
                  ? "Menerapkan..."
                  : `Terapkan Jadwal (${previewResult.placements.length} penempatan)`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
