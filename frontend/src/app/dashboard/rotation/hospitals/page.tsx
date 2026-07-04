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
import { Pencil, Trash2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-helpers";

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

interface CapacityRow {
  id: string;
  hospital_id: string;
  stase_id: string;
  rotation_period_id?: string | null;
  max_students: number;
  occupied: number;
  stase?: { id: string; name?: string };
  rotation_period?: { id: string; name?: string } | null;
}

interface StaseOption {
  id: string;
  name?: string;
}

interface PeriodOption {
  id: string;
  name?: string;
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

  // ---------- Kuota kapasitas per stase ----------
  const [capacityHospital, setCapacityHospital] = useState<Hospital | null>(null);
  const [capacities, setCapacities] = useState<CapacityRow[]>([]);
  const [stases, setStases] = useState<StaseOption[]>([]);
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [capForm, setCapForm] = useState({ stase_id: "", rotation_period_id: "", max_students: 10 });
  const [capLoading, setCapLoading] = useState(false);

  const openCapacityDialog = async (hospital: Hospital) => {
    setCapacityHospital(hospital);
    setCapForm({ stase_id: "", rotation_period_id: "", max_students: 10 });
    setCapLoading(true);
    try {
      const [capRes, staseRes, periodRes] = await Promise.all([
        api.get(`/api/v1/rotation/capacities?hospital_id=${hospital.id}`),
        api.get("/api/v1/academic/stase"),
        api.get("/api/v1/rotation/periods"),
      ]);
      setCapacities(capRes.data.data || []);
      setStases(staseRes.data.data || []);
      setPeriods(periodRes.data.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memuat data kuota."));
    } finally {
      setCapLoading(false);
    }
  };

  const refreshCapacities = async (hospitalId: string) => {
    const res = await api.get(`/api/v1/rotation/capacities?hospital_id=${hospitalId}`);
    setCapacities(res.data.data || []);
  };

  const saveCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capacityHospital) return;
    try {
      await api.post("/api/v1/rotation/capacities", {
        hospital_id: capacityHospital.id,
        stase_id: capForm.stase_id,
        rotation_period_id: capForm.rotation_period_id || null,
        max_students: capForm.max_students,
      });
      toast.success("Kuota disimpan.");
      refreshCapacities(capacityHospital.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan kuota."));
    }
  };

  const deleteCapacity = async (id: string) => {
    if (!capacityHospital) return;
    try {
      await api.delete(`/api/v1/rotation/capacities/${id}`);
      toast.success("Kuota dihapus.");
      refreshCapacities(capacityHospital.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus kuota."));
    }
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
                        <Button variant="outline" size="sm" onClick={() => openCapacityDialog(hospital)} title="Kuota per stase">
                          <Users className="h-4 w-4" />
                        </Button>
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

      {/* Dialog kuota kapasitas per stase */}
      <Dialog open={!!capacityHospital} onOpenChange={(open) => !open && setCapacityHospital(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Kuota Mahasiswa — {capacityHospital?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Batas jumlah mahasiswa per stase. Penempatan rotasi otomatis ditolak bila kuota penuh.
          </p>

          {capLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="space-y-2">
              {capacities.length === 0 ? (
                <p className="text-sm text-muted-foreground border border-dashed rounded-md p-4 text-center">
                  Belum ada kuota diatur — semua stase tidak dibatasi.
                </p>
              ) : (
                capacities.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border rounded-md p-3 text-sm">
                    <div>
                      <p className="font-medium">{c.stase?.name || "-"}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.rotation_period?.name || "Semua periode"} — terisi {c.occupied}/{c.max_students}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteCapacity(c.id)}
                      aria-label="Hapus kuota"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          <form onSubmit={saveCapacity} className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Tambah / perbarui kuota</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                value={capForm.stase_id}
                onChange={(e) => setCapForm({ ...capForm, stase_id: e.target.value })}
              >
                <option value="">Pilih Stase</option>
                {stases.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={capForm.rotation_period_id}
                onChange={(e) => setCapForm({ ...capForm, rotation_period_id: e.target.value })}
              >
                <option value="">Semua periode</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <Input
                type="number"
                min={1}
                max={1000}
                required
                value={capForm.max_students}
                onChange={(e) => setCapForm({ ...capForm, max_students: Number(e.target.value) })}
                placeholder="Maks mhs"
              />
            </div>
            <Button type="submit" className="w-full">Simpan Kuota</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
