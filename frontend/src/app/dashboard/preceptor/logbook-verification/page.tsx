"use client";

import { useState, useEffect } from "react";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Search, Clock } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

// Simplified type for demonstration
interface LogbookEntry {
  id: string;
  activity_date: string;
  activity_type: string;
  description: string;
  patient_initials: string | null;
  status: string;
  student: {
    user: {
      name: string;
    }
  };
  rotationAssignment?: {
    stase: {
      name: string;
    }
  };
}

export default function LogbookVerificationPage() {
  const [logbooks, setLogbooks] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogbooks = async () => {
    try {
      setLoading(true);
      // Fetch only submitted logbooks (pending_verification=true)
      const res = await api.get("/clinical/logbooks?pending_verification=true");
      setLogbooks(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat logbook");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogbooks();
  }, []);

  const handleVerify = async (id: string) => {
    try {
      await api.patch(`/clinical/logbooks/${id}/verify`, {
        preceptor_feedback: "Telah diverifikasi dengan baik."
      });
      toast.success("Logbook berhasil diverifikasi");
      fetchLogbooks();
    } catch (error) {
      toast.error("Gagal memverifikasi logbook");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.patch(`/clinical/logbooks/${id}/reject`, {
        preceptor_feedback: "Mohon perbaiki deskripsi aktivitas."
      });
      toast.success("Logbook ditolak");
      fetchLogbooks();
    } catch (error) {
      toast.error("Gagal menolak logbook");
    }
  };

  const filteredLogbooks = logbooks.filter(lb => 
    lb.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    lb.student?.user?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verifikasi Logbook</h1>
        <p className="text-muted-foreground mt-2">
          Tinjau dan berikan penilaian pada logbook aktivitas klinis mahasiswa bimbingan Anda.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
          <div>
            <CardTitle>Menunggu Verifikasi</CardTitle>
            <CardDescription>
              Terdapat {logbooks.length} logbook yang perlu ditinjau.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari mahasiswa atau deskripsi..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex items-center justify-center py-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
             </div>
          ) : filteredLogbooks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <CheckCircle2 className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-lg font-medium">Semua logbook telah diverifikasi</p>
              <p className="text-sm">Tidak ada logbook yang menunggu tindakan Anda saat ini.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogbooks.map((logbook) => (
                <div key={logbook.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="space-y-1 mb-4 md:mb-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-lg">{logbook.student?.user?.name}</span>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        <Clock className="w-3 h-3 mr-1" /> Menunggu
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center space-x-2">
                      <span>{logbook.rotationAssignment?.stase?.name || 'Stase Klinis'}</span>
                      <span>•</span>
                      <span>{new Date(logbook.activity_date).toLocaleDateString('id-ID')}</span>
                      <span>•</span>
                      <span className="uppercase text-xs font-semibold">{logbook.activity_type}</span>
                    </div>
                    <p className="text-sm mt-2 line-clamp-2">{logbook.description}</p>
                    {logbook.patient_initials && (
                      <p className="text-xs text-gray-500">Pasien: {logbook.patient_initials}</p>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 w-full md:w-auto">
                    <Button 
                      variant="outline" 
                      className="w-full md:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => handleReject(logbook.id)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Tolak
                    </Button>
                    <Button 
                      className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleVerify(logbook.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Verifikasi
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
