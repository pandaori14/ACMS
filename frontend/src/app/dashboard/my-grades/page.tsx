"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { StaseGrade } from "@/lib/types";
import { BookOpen, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentGradesPage() {
  const [grades, setGrades] = useState<StaseGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const res = await api.get("/api/v1/grades");
        setGrades(res.data.data || res.data);
      } catch (err) {
        console.error("Failed to load grades", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, []);

  return (
    <div className="space-y-6">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Transkrip Klinis (Internal)</h1>
        <p className="text-muted-foreground mt-1">
          Berikut adalah rincian Nilai Akhir Stase yang telah dipublikasikan oleh Program Studi.
          Nilai ini akan diteruskan ke SIAKAD sebagai nilai KHS Resmi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : grades.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl bg-gray-50/50">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground opacity-30 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Belum Ada Nilai</h3>
            <p className="text-muted-foreground mt-1">Anda belum memiliki nilai akhir stase yang dipublikasikan.</p>
          </div>
        ) : (
          grades.map((grade) => (
            <Card key={grade.id} className="overflow-hidden relative group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardDescription className="font-medium text-blue-600 mb-1">
                      {grade.rotation_assignment?.stase?.code}
                    </CardDescription>
                    <CardTitle className="text-xl">
                      {grade.rotation_assignment?.stase?.name}
                    </CardTitle>
                  </div>
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <GraduationCap className="h-5 w-5 text-blue-700" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <span className="block text-muted-foreground text-xs mb-1">Mini-CEX</span>
                    <span className="font-medium">{grade.minicex_score}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <span className="block text-muted-foreground text-xs mb-1">DOPS</span>
                    <span className="font-medium">{grade.dops_score}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <span className="block text-muted-foreground text-xs mb-1">CBD</span>
                    <span className="font-medium">{grade.cbd_score}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <span className="block text-muted-foreground text-xs mb-1">Logbook</span>
                    <span className="font-medium">{grade.logbook_score}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <div>
                    <span className="block text-sm text-blue-800 mb-1">Nilai Akhir</span>
                    <span className="text-3xl font-bold text-blue-900">{grade.final_score}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm text-blue-800 mb-1">Huruf Mutu</span>
                    <span className="text-3xl font-black text-blue-700">{grade.letter_grade}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
