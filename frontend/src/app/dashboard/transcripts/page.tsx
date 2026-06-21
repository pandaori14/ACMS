"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Search, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";

export default function TranscriptsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // reset to page 1 on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ["academic_students", page, debouncedSearch],
    queryFn: async () => {
      const res = await api.get(`/api/v1/academic/students`, {
        params: {
          page,
          search: debouncedSearch,
          per_page: 10
        }
      });
      return res.data; // returns laravel paginator object
    }
  });

  const students = paginatedData?.data || [];
  const totalPages = paginatedData?.last_page || 1;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transkrip & Yudisium</h1>
          <p className="text-muted-foreground mt-1">Cetak rekapitulasi nilai akhir profesi mahasiswa.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Mahasiswa (Peserta Didik)</CardTitle>
          <CardDescription>Pilih mahasiswa untuk melihat dan mencetak transkrip nilainya.</CardDescription>
          <div className="mt-4 flex max-w-sm items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari nama atau NIM..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIM</TableHead>
                    <TableHead>Nama Mahasiswa</TableHead>
                    <TableHead>Angkatan</TableHead>
                    <TableHead>Program Studi</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length > 0 ? (
                    students.map((student: any) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.user?.identity_number || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-primary/70" />
                            {student.user?.name}
                          </div>
                        </TableCell>
                        <TableCell>{student.cohort?.name || "-"}</TableCell>
                        <TableCell>{student.program?.name || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => router.push(`/dashboard/transcripts/${student.user_id}`)}
                          >
                            <FileText className="h-4 w-4" />
                            Lihat Transkrip
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Tidak ada mahasiswa yang ditemukan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {!isLoading && totalPages > 1 && (
          <CardFooter className="flex items-center justify-between border-t p-4">
            <div className="text-sm text-muted-foreground">
              Halaman {page} dari {totalPages} (Total: {paginatedData?.total || 0} Mahasiswa)
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Selanjutnya
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
