"use client";

import { useState, useEffect } from "react";
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
import { Pencil, Trash2, Plus } from "lucide-react";

interface Hospital {
  id: string;
  code: string;
  name: string;
  type: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_tolerance_meters: number | null;
}

export default function HospitalManagement() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "",
    address: "",
    latitude: "",
    longitude: "",
    radius_tolerance_meters: "",
  });

  const fetchHospitals = async () => {
    try {
      const res = await api.get("/api/v1/rotation/hospitals");
      setHospitals(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      latitude: formData.latitude === "" ? null : Number(formData.latitude),
      longitude: formData.longitude === "" ? null : Number(formData.longitude),
      radius_tolerance_meters:
        formData.radius_tolerance_meters === "" ? null : Number(formData.radius_tolerance_meters),
    };
    try {
      if (editingId) {
        await api.put(`/api/v1/rotation/hospitals/${editingId}`, payload);
      } else {
        await api.post("/api/v1/rotation/hospitals", payload);
      }
      setIsOpen(false);
      resetForm();
      fetchHospitals();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data rumah sakit");
    }
  };

  const handleEdit = (hospital: Hospital) => {
    setEditingId(hospital.id);
    setFormData({
      code: hospital.code,
      name: hospital.name,
      type: hospital.type,
      address: hospital.address || "",
      latitude: hospital.latitude?.toString() ?? "",
      longitude: hospital.longitude?.toString() ?? "",
      radius_tolerance_meters: hospital.radius_tolerance_meters?.toString() ?? "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus rumah sakit ini?")) return;
    try {
      await api.delete(`/api/v1/rotation/hospitals/${id}`);
      fetchHospitals();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ code: "", name: "", type: "", address: "", latitude: "", longitude: "", radius_tolerance_meters: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rumah Sakit</h1>
          <p className="text-muted-foreground mt-1">Kelola data rumah sakit jejaring dan satelit.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="h-4 w-4" /> Tambah RS
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Rumah Sakit" : "Tambah Rumah Sakit"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Kode RS</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. RSDM"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Nama RS</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. RSUD Dr. Moewardi"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tipe RS</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val ?? "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Utama">Utama</SelectItem>
                    <SelectItem value="Satelit">Satelit</SelectItem>
                    <SelectItem value="Afiliasi">Afiliasi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alamat</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Alamat lengkap"
                />
              </div>

              <div className="rounded-md border bg-slate-50/50 dark:bg-slate-900/30 p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Geofence Presensi (opsional) — koordinat & radius toleransi untuk validasi GPS check-in mahasiswa.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="-7.5589"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="110.7724"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Radius Toleransi (meter)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={5000}
                    value={formData.radius_tolerance_meters}
                    onChange={(e) => setFormData({ ...formData, radius_tolerance_meters: e.target.value })}
                    placeholder="Kosongkan untuk default sistem (100 m)"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit">Simpan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="clean-card shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Kode</th>
                <th className="px-6 py-4 font-medium">Nama Rumah Sakit</th>
                <th className="px-6 py-4 font-medium">Tipe</th>
                <th className="px-6 py-4 font-medium">Alamat</th>
                <th className="px-6 py-4 font-medium">Geofence</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : hospitals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Belum ada data rumah sakit.
                  </td>
                </tr>
              ) : (
                hospitals.map((hospital) => (
                  <tr key={hospital.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{hospital.code}</td>
                    <td className="px-6 py-4">{hospital.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        hospital.type === 'Utama' ? 'bg-blue-100 text-blue-700' : 
                        hospital.type === 'Satelit' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {hospital.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{hospital.address || '-'}</td>
                    <td className="px-6 py-4">
                      {hospital.latitude != null && hospital.longitude != null ? (
                        <div className="flex flex-col text-xs">
                          <span className="font-mono text-slate-600">
                            {Number(hospital.latitude).toFixed(4)}, {Number(hospital.longitude).toFixed(4)}
                          </span>
                          <span className="text-muted-foreground">
                            radius {hospital.radius_tolerance_meters ?? 100} m
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600">Belum diatur</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(hospital)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(hospital.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
