"use client";

import { useState, useEffect, use } from "react";
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
import { UserCircle, HospitalIcon, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

export default function RotationScheduler({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const periodId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [stases, setStases] = useState<Stase[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedStase, setSelectedStase] = useState<string>("");
  
  // Data State
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, [periodId]);

  useEffect(() => {
    if (selectedStase) {
      fetchAssignments();
    }
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
      const res = await api.get(`/api/v1/rotation/assignments?rotation_period_id=${periodId}&stase_id=${selectedStase}`);
      setAssignments(res.data.data);
    } catch (err) {
      console.error(err);
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
      alert("Gagal memindahkan mahasiswa: " + getApiErrorMessage(err, err instanceof Error ? err.message : "Terjadi kesalahan"));
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
          <h1 className="text-3xl font-bold tracking-tight">Penjadwalan Interaktif</h1>
          <p className="text-muted-foreground mt-1">Tarik dan letakkan mahasiswa ke rumah sakit tujuan.</p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border">
          <span className="text-sm font-medium pl-2">Filter Stase:</span>
          <Select value={selectedStase} onValueChange={(v) => setSelectedStase(v ?? "")}>
            <SelectTrigger className="w-[250px] border-none shadow-none">
              <SelectValue placeholder="Pilih Stase" />
            </SelectTrigger>
            <SelectContent>
              {stases.map((stase) => (
                <SelectItem key={stase.id} value={stase.id}>{stase.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Mode Penjadwalan Aktif</AlertTitle>
        <AlertDescription>
          Perubahan yang Anda lakukan akan langsung tersimpan ke dalam database secara otomatis.
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
                        <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full font-medium">
                          {students.length}
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
    </div>
  );
}
