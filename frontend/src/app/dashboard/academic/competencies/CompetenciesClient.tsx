"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ClipboardList, Plus, Edit, Trash2, Loader2, Search } from "lucide-react";

interface Competency {
  id: string;
  name: string;
  type: string;
  category: string | null;
  level: string | null;
  description: string | null;
  stase_id?: string | null;
  min_cases?: number;
  stase?: { id: string; name?: string } | null;
}

interface StaseOption {
  id: string;
  name?: string;
}

export function CompetenciesClient() {
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState<Partial<Competency>>({
    name: "",
    type: "disease",
    category: "",
    level: "",
    description: "",
    stase_id: "",
    min_cases: 1,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [stases, setStases] = useState<StaseOption[]>([]);

  useEffect(() => {
    fetchCompetencies();
    api.get("/api/v1/academic/stase")
      .then((res) => setStases(res.data.data || []))
      .catch(() => setStases([]));
  }, []);

  const fetchCompetencies = async () => {
    try {
      const { data } = await api.get("/api/v1/academic/competencies?per_page=100");
      setCompetencies(data.data || []);
    } catch (err) {
      console.error("Failed to fetch competencies", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setForm({
      name: "",
      type: "disease",
      category: "",
      level: "",
      description: "",
      stase_id: "",
      min_cases: 1,
    });
    setOpen(true);
  };

  const handleOpenEdit = (comp: Competency) => {
    setEditingId(comp.id);
    setForm({ ...comp, stase_id: comp.stase_id || "", min_cases: comp.min_cases ?? 1 });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kompetensi ini?")) return;
    try {
      await api.delete(`/api/v1/academic/competencies/${id}`);
      toast.success("Kompetensi dihapus.");
      fetchCompetencies();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus kompetensi."));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/v1/academic/competencies/${editingId}`, form);
      } else {
        await api.post("/api/v1/academic/competencies", form);
      }
      setOpen(false);
      toast.success(editingId ? "Kompetensi diperbarui." : "Kompetensi ditambahkan.");
      fetchCompetencies();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan kompetensi."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Cari kompetensi..."
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        
        <button
          onClick={handleOpenNew}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Kompetensi
        </button>
      </div>

      <Card className="clean-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-slate-500" />
            Katalog Kompetensi
          </CardTitle>
          <CardDescription>
            Daftar kompetensi yang tersedia untuk referensi logbook mahasiswa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : competencies.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-sm">
              Belum ada data kompetensi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                  <tr>
                    <th className="py-3 px-4">Nama Kompetensi</th>
                    <th className="py-3 px-4">Tipe</th>
                    <th className="py-3 px-4">Kategori / Sistem</th>
                    <th className="py-3 px-4">Tingkat Kemampuan</th>
                    <th className="py-3 px-4">Stase</th>
                    <th className="py-3 px-4">Target</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {competencies.map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-medium text-slate-900">{comp.name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${comp.type === 'disease' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {comp.type === 'disease' ? 'Penyakit (SKDI)' : 'Keterampilan Klinis'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{comp.category || '-'}</td>
                      <td className="py-3 px-4">
                        {comp.level ? (
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold">
                            Level {comp.level}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-xs">{comp.stase?.name || '-'}</td>
                      <td className="py-3 px-4 text-xs font-medium">{comp.min_cases ?? 1} kasus</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleOpenEdit(comp)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(comp.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors">
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Kompetensi" : "Tambah Kompetensi Baru"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Perbarui informasi kompetensi di bawah ini." : "Masukkan detail kompetensi yang akan ditambahkan ke sistem."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipe Kompetensi</label>
              <select 
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
              >
                <option value="disease">Penyakit (SKDI)</option>
                <option value="skill">Keterampilan Klinis (Skill)</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Kompetensi</label>
              <input 
                required
                type="text"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Contoh: Asma Bronkial"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategori / Sistem</label>
                <input 
                  type="text"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  value={form.category || ""}
                  onChange={e => setForm({...form, category: e.target.value})}
                  placeholder="Contoh: Sistem Respirasi"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Level Kompetensi</label>
                <select 
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  value={form.level || ""}
                  onChange={e => setForm({...form, level: e.target.value})}
                >
                  <option value="">-- Pilih Level --</option>
                  <option value="1">Level 1</option>
                  <option value="2">Level 2</option>
                  <option value="3A">Level 3A</option>
                  <option value="3B">Level 3B</option>
                  <option value="4A">Level 4A</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Stase (untuk target progres)</label>
                <select
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  value={form.stase_id || ""}
                  onChange={e => setForm({...form, stase_id: e.target.value})}
                >
                  <option value="">-- Tanpa stase (umum) --</option>
                  {stases.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Minimal Kasus</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  value={form.min_cases ?? 1}
                  onChange={e => setForm({...form, min_cases: Number(e.target.value)})}
                />
                <p className="text-xs text-slate-500">Dihitung dari logbook terverifikasi mahasiswa.</p>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                Batal
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors inline-flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
