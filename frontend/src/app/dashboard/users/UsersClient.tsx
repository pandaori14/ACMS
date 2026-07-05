"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { ApiError } from "@/lib/api-helpers";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Plus, Edit, Trash2, Loader2, Search, Upload, GraduationCap } from "lucide-react";
import { useRef } from "react";

interface UserForm {
  name: string;
  email: string;
  password: string;
  identity_number: string;
  phone: string;
  status: string;
  roles: string[];
  hospital_ids: string[];
  program_id: string;
}

interface Hospital {
  id: string;
  name: string;
}

interface Program {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  identity_number: string | null;
  phone: string | null;
  status: string;
  roles: string[];
  hospitals?: Hospital[];
  program?: Program;
  program_id?: string;
}

export function UsersClient() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>({
    name: "",
    email: "",
    password: "",
    identity_number: "",
    phone: "",
    status: "active",
    roles: [],
    hospital_ids: [],
    program_id: "",
  });

  const { data: usersData, isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<User[]> => {
      const res = await api.get("/api/users?per_page=100");
      return res.data.data || [];
    }
  });

  const { data: hospitalsData, isLoading: loadingHospitals } = useQuery({
    queryKey: ['hospitals'],
    queryFn: async (): Promise<Hospital[]> => {
      const res = await api.get("/api/v1/rotation/hospitals");
      return res.data.data || [];
    }
  });

  const { data: programsData, isLoading: loadingPrograms } = useQuery({
    queryKey: ['programs'],
    queryFn: async (): Promise<Program[]> => {
      const res = await api.get("/api/v1/academic/programs");
      return res.data.data || [];
    }
  });

  const users = usersData || [];
  const hospitals = hospitalsData || [];
  const programs = programsData || [];
  const loading = loadingUsers || loadingHospitals || loadingPrograms;

  // Hardcoded roles for now
  const roles = [
    { id: 1, name: "Super Admin" },
    { id: 2, name: "Admin Prodi" },
    { id: 3, name: "Kaprodi" },
    { id: 4, name: "Dosen" },
    { id: 5, name: "Dodiknis" },
    { id: 6, name: "Admin RS" },
    { id: 7, name: "Mahasiswa" },
    { id: 8, name: "Finance" },
  ];

  const handleOpenNew = () => {
    setEditingId(null);
    setForm({
      name: "",
      email: "",
      password: "",
      identity_number: "",
      phone: "",
      status: "active",
      roles: [],
      hospital_ids: [],
      program_id: "",
    });
    setOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: "", // leave blank for edit unless they want to change it
      identity_number: user.identity_number || "",
      phone: user.phone || "",
      status: user.status || "active",
      roles: user.roles || [],
      hospital_ids: user.hospitals?.map(h => h.id) || [],
      program_id: user.program_id || "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) return;
    try {
      await api.delete(`/api/users/${id}`);
      toast.success("Pengguna dihapus.");
      refetchUsers();
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghapus pengguna.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<UserForm> = { ...form };
      if (!payload.password) delete payload.password; // Don't send empty password on edit
      if (!payload.program_id) delete payload.program_id; // Don't send empty program_id
      if (payload.hospital_ids?.length === 0) delete payload.hospital_ids; // Same for hospital_ids

      if (editingId) {
        await api.put(`/api/users/${editingId}`, payload);
      } else {
        await api.post("/api/users", payload);
      }
      setOpen(false);
      toast.success(editingId ? "Pengguna diperbarui." : "Pengguna ditambahkan.");
      refetchUsers();
    } catch (err) {
      console.error("FULL ERROR", err);
      const e = err as ApiError;
      let msg = "Gagal menyimpan pengguna.";
      if (e.response?.data?.errors) {
        // Gabungkan semua pesan error validasi (misal: "Email sudah ada", "Password minimal 8", dsb)
        const errors = e.response.data.errors;
        msg = Object.values(errors).flat().join("\n");
      } else if (e.response?.data?.message) {
        msg = e.response.data.message;
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (roleName: string) => {
    setForm((prev) => {
      const roles = prev.roles.includes(roleName)
        ? prev.roles.filter((r: string) => r !== roleName)
        : [...prev.roles, roleName];
      return { ...prev, roles };
    });
  };

  const toggleHospital = (hospitalId: string) => {
    setForm((prev) => {
      const hospital_ids = prev.hospital_ids.includes(hospitalId)
        ? prev.hospital_ids.filter((id: string) => id !== hospitalId)
        : [...prev.hospital_ids, hospitalId];
      return { ...prev, hospital_ids };
    });
  };

  // ─────── Toggle status cepat (aktif ↔ nonaktif) ───────
  const [toggling, setToggling] = useState<User | null>(null);

  const handleToggleStatus = async () => {
    if (!toggling) return;
    const nextStatus = toggling.status === "active" ? "inactive" : "active";
    try {
      await api.put(`/api/users/${toggling.id}`, {
        name: toggling.name,
        email: toggling.email,
        identity_number: toggling.identity_number,
        status: nextStatus,
        roles: toggling.roles,
      });
      toast.success(nextStatus === "inactive" ? "Pengguna dinonaktifkan — tidak bisa login." : "Pengguna diaktifkan kembali.");
      refetchUsers();
    } catch {
      toast.error("Gagal mengubah status pengguna.");
    } finally {
      setToggling(null);
    }
  };

  // ─────── Import massal ───────
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importRole, setImportRole] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: { row: number; reason: string }[] } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      fd.append("role", importRole);
      const res = await api.post("/api/users/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(res.data.data);
      toast.success(res.data.message);
      refetchUsers();
    } catch (err) {
      const e2 = err as ApiError;
      toast.error(e2.response?.data?.message || "Import gagal diproses.");
    } finally {
      setIsImporting(false);
    }
  };

  const downloadImportTemplate = async () => {
    try {
      const res = await api.get("/api/users/import-template", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template-import-pengguna.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Gagal mengunduh template.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Cari pengguna..."
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => { setImportRole(""); setImportFile(null); setImportResult(null); setIsImportOpen(true); }}
            className="inline-flex items-center gap-2 border px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import Excel
          </button>
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Pengguna
          </button>
        </div>
      </div>

      <Card className="clean-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" />
            Daftar Pengguna
          </CardTitle>
          <CardDescription>
            Kelola akses dan data pengguna sistem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-sm">
              Belum ada data pengguna.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                  <tr>
                    <th className="py-3 px-4">Nama / Identitas</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Peran (Role)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{user.name}</div>
                        <div className="text-xs text-slate-500">{user.identity_number || '-'}</div>
                      </td>
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map(role => (
                            <span key={role} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setToggling(user)}
                          title="Klik untuk ubah status"
                          className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${user.status === 'active' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                          {user.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleOpenEdit(user)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(user.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Pengguna" : "Tambah Pengguna Baru"}</DialogTitle>
            <DialogDescription>
              Isi data pengguna dan tetapkan peran (role) yang sesuai.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-6 py-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Lengkap</label>
                <input required type="text" className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <input required type="email" className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password {editingId && <span className="text-xs font-normal text-slate-400">(Kosongkan jika tidak diubah)</span>}</label>
                <input type="password" required={!editingId} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">No. Identitas (NIM/NIP)</label>
                <input type="text" className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" value={form.identity_number} onChange={e => setForm({...form, identity_number: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2 w-48">
              <label className="text-sm font-medium">Status Akun</label>
              <select
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                value={form.status}
                onChange={e => setForm({...form, status: e.target.value})}
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif (tidak bisa login)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Peran Pengguna (Role)</label>
              <div className="flex flex-wrap gap-3 p-3 border rounded-md bg-slate-50/50">
                {roles.map(role => (
                  <label key={role.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded text-primary focus:ring-primary"
                      checked={form.roles.includes(role.name)}
                      onChange={() => toggleRole(role.name)}
                    />
                    {role.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Optional Fields Based on Roles */}
            {form.roles.includes("Dodiknis") && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Afiliasi Rumah Sakit (Bisa lebih dari 1)</label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-40 overflow-y-auto bg-slate-50/50">
                  {hospitals.map(hospital => (
                    <label key={hospital.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded text-primary focus:ring-primary"
                        checked={form.hospital_ids.includes(hospital.id)}
                        onChange={() => toggleHospital(hospital.id)}
                      />
                      <span className="truncate">{hospital.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {(form.roles.includes("Mahasiswa") || form.roles.includes("Admin Prodi")) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Program Studi</label>
                <select 
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  value={form.program_id}
                  onChange={e => setForm({...form, program_id: e.target.value})}
                >
                  <option value="">-- Pilih Program Studi --</option>
                  {programs.map(prog => (
                    <option key={prog.id} value={prog.id}>{prog.name}</option>
                  ))}
                </select>
              </div>
            )}

            <DialogFooter className="pt-4 border-t">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                Batal
              </button>
              <button type="submit" disabled={saving || form.roles.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors inline-flex items-center gap-2 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan Pengguna
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi toggle status */}
      <Dialog open={!!toggling} onOpenChange={(o) => !o && setToggling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {toggling?.status === "active" ? "Nonaktifkan Pengguna?" : "Aktifkan Pengguna?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold">{toggling?.name}</span>{" "}
            {toggling?.status === "active"
              ? "tidak akan bisa login sampai diaktifkan kembali. Data & riwayatnya tetap utuh."
              : "akan bisa login kembali dengan akun yang sama."}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setToggling(null)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md">
              Batal
            </button>
            <button
              onClick={handleToggleStatus}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md ${toggling?.status === "active" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {toggling?.status === "active" ? "Nonaktifkan" : "Aktifkan"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog import massal */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Pengguna dari Excel/CSV</DialogTitle>
            <DialogDescription>
              Semua baris akan diberi role yang dipilih. Kolom wajib: <b>nama, email</b>
              {" "}(kolom <b>password</b> & <b>nim</b> opsional — password kosong dibuat otomatis
              dan dikirim via email).{" "}
              <button type="button" onClick={downloadImportTemplate} className="underline font-medium text-blue-700">
                Unduh template
              </button>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleImport} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role untuk semua baris</label>
              <select
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                value={importRole}
                onChange={(e) => setImportRole(e.target.value)}
              >
                <option value="">-- Pilih Role --</option>
                {roles.filter((r) => r.name !== "Super Admin" && r.name !== "Mahasiswa").map((r) => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                Untuk mahasiswa, gunakan menu Mahasiswa → Import Excel (membuat profil akademik sekaligus).
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">File (.xlsx / .csv, maks 5MB)</label>
              <input
                ref={importFileRef}
                type="file"
                required
                accept=".xlsx,.xls,.csv"
                className="w-full text-sm border rounded-md px-3 py-2"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>

            {importResult && (
              <div className="rounded-md border p-3 text-sm space-y-2">
                <p className="font-medium text-emerald-700">✓ {importResult.created} pengguna dibuat</p>
                {importResult.skipped.length > 0 && (
                  <div>
                    <p className="font-medium text-amber-700 mb-1">{importResult.skipped.length} baris dilewati:</p>
                    <ul className="list-disc pl-5 text-slate-600 max-h-36 overflow-y-auto">
                      {importResult.skipped.map((s, i) => (
                        <li key={i}>Baris {s.row}: {s.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isImporting || !importFile || !importRole}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {isImporting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isImporting ? "Memproses import..." : "Mulai Import"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
