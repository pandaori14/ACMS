"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, ClipboardCheck, Clock, FileText } from "lucide-react";

interface Exam {
  id: string;
  type: string;
  status: string;
  name: string;
  date: string;
  stase?: { name: string } | null;
}

export default function ExaminationsPage() {
  const user = useAuthStore((state) => state.user);
  const { data: examsData, isLoading: loading } = useQuery({
    queryKey: ['examinations'],
    queryFn: async (): Promise<Exam[]> => {
      const res = await api.get("/api/v1/examinations");
      return res.data.data;
    }
  });

  const exams = examsData || [];

  const isAdmin = user?.roles?.includes("Admin Prodi");
  const isStudent = user?.roles?.includes("Mahasiswa");
  const isPreceptor = user?.roles?.includes("Dodiknis");

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Ujian</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Kelola jadwal ujian OSCE dan CBT" : "Daftar ujian yang harus Anda ikuti atau uji"}
          </p>
        </div>
        
        {isAdmin && (
          <Button className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Jadwalkan Ujian Baru
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {exams.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            <ClipboardCheck className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>Belum ada ujian yang dijadwalkan.</p>
          </div>
        ) : (
          exams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-md transition-all group">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={exam.type === "OSCE" ? "default" : "secondary"}>
                    {exam.type}
                  </Badge>
                  <Badge variant={exam.status === "COMPLETED" ? "outline" : (exam.status === "ONGOING" ? "destructive" : "secondary")}>
                    {exam.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                  {exam.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <FileText className="h-4 w-4" />
                  {exam.stase?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground mb-4">
                  <Clock className="mr-2 h-4 w-4" />
                  {new Date(exam.date).toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                
                <div className="flex gap-2">
                  {isPreceptor && exam.status !== "COMPLETED" && (
                    <Button variant="default" className="w-full" onClick={() => window.location.href = `/dashboard/examinations/${exam.id}/assess`}>
                      Mulai Menilai
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="outline" className="w-full" onClick={() => window.location.href = `/dashboard/examinations/${exam.id}`}>
                      Detail & Peserta
                    </Button>
                  )}
                  {isStudent && (
                    <Button variant="outline" className="w-full" disabled={exam.status === "DRAFT"}>
                      Lihat Detail
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
