"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, Edit2, Trash2, Save, X, PlusCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function RubricsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  const fetchTemplates = async () => {
    try {
      const res = await api.get("/api/v1/assessments/templates");
      setTemplates(res.data.data || []);
    } catch (err) {
      toast.error("Gagal mengambil data template rubrik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleAddNew = () => {
    setEditingTemplate({
      id: "new",
      name: "Template Baru",
      type: "OSCE",
      is_active: true,
      rubric_schema: {
        max_total_score: 100,
        indicators: [
          { key: "aspek_1", label: "Aspek 1", max_score: 100, weight: 100 }
        ]
      }
    });
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    
    // Validate total weight is 100 if weights are used
    const hasWeight = editingTemplate.rubric_schema?.indicators?.some((i: any) => i.weight !== undefined);
    if (hasWeight) {
        const totalWeight = editingTemplate.rubric_schema?.indicators?.reduce((acc: number, curr: any) => acc + (curr.weight || 0), 0);
        if (totalWeight !== 100) {
            toast.error(`Total bobot persentase harus 100%. Saat ini: ${totalWeight}%`);
            return;
        }
    }

    try {
      if (editingTemplate.id === "new") {
        const payload = { ...editingTemplate };
        delete payload.id;
        await api.post("/api/v1/assessments/templates", payload);
        toast.success("Template berhasil dibuat");
      } else {
        await api.put(`/api/v1/assessments/templates/${editingTemplate.id}`, editingTemplate);
        toast.success("Template berhasil diperbarui");
      }
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal menyimpan template");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus template ini?")) return;
    try {
      await api.delete(`/api/v1/assessments/templates/${id}`);
      toast.success("Template dihapus");
      fetchTemplates();
    } catch (err: any) {
      toast.error("Gagal menghapus template");
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-1/4" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rubric Builder</h1>
          <p className="text-muted-foreground">Kelola format dan bobot penilaian untuk OSCE, Mini-CEX, dll.</p>
        </div>
        {!editingTemplate && (
          <Button onClick={handleAddNew}><Plus className="mr-2 h-4 w-4" /> Template Baru</Button>
        )}
      </div>

      {editingTemplate ? (
        <Card className="border-primary/20 shadow-md">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle>{editingTemplate.id === 'new' ? 'Buat Template Rubrik' : 'Edit Template Rubrik'}</CardTitle>
            <CardDescription>Sesuaikan indikator, nilai maksimal, dan bobot persentasenya.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Template</label>
                <Input 
                  value={editingTemplate.name} 
                  onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})} 
                  placeholder="Contoh: OSCE Stase IPD" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Jenis Ujian</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editingTemplate.type}
                  onChange={(e) => setEditingTemplate({...editingTemplate, type: e.target.value})}
                >
                  <option value="OSCE">OSCE</option>
                  <option value="Mini-CEX">Mini-CEX</option>
                  <option value="DOPS">DOPS</option>
                  <option value="CBD">CBD</option>
                  <option value="Tugas Ilmiah">Tugas Ilmiah</option>
                  <option value="Ujian Kasus">Ujian Kasus</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-semibold text-lg">Indikator Penilaian</h3>
                <div className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                  Total Bobot: <span className="font-bold text-foreground">
                    {editingTemplate.rubric_schema?.indicators?.reduce((a:number, b:any) => a + (Number(b.weight) || 0), 0) || 0}%
                  </span>
                </div>
              </div>

              {editingTemplate.rubric_schema?.indicators?.map((ind: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">Label Indikator</label>
                    <Input 
                      value={ind.label} 
                      onChange={(e) => {
                        const newInds = [...(editingTemplate.rubric_schema?.indicators || [])];
                        newInds[idx].label = e.target.value;
                        newInds[idx].key = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_');
                        setEditingTemplate({...editingTemplate, rubric_schema: {...editingTemplate.rubric_schema, indicators: newInds}});
                      }}
                      placeholder="Contoh: Anamnesis"
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <label className="text-xs text-muted-foreground">Max Skor</label>
                    <Input 
                      type="number" 
                      value={ind.max_score} 
                      onChange={(e) => {
                        const newInds = [...(editingTemplate.rubric_schema?.indicators || [])];
                        newInds[idx].max_score = Number(e.target.value);
                        setEditingTemplate({...editingTemplate, rubric_schema: {...editingTemplate.rubric_schema, indicators: newInds}});
                      }}
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <label className="text-xs text-muted-foreground">Bobot (%)</label>
                    <Input 
                      type="number" 
                      value={ind.weight || 0} 
                      onChange={(e) => {
                        const newInds = [...(editingTemplate.rubric_schema?.indicators || [])];
                        newInds[idx].weight = Number(e.target.value);
                        setEditingTemplate({...editingTemplate, rubric_schema: {...editingTemplate.rubric_schema, indicators: newInds}});
                      }}
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:text-red-700 hover:bg-red-100 mt-5"
                    onClick={() => {
                      const newInds = [...(editingTemplate.rubric_schema?.indicators || [])];
                      newInds.splice(idx, 1);
                      setEditingTemplate({...editingTemplate, rubric_schema: {...editingTemplate.rubric_schema, indicators: newInds}});
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-dashed"
                onClick={() => {
                  const newInds = [...(editingTemplate.rubric_schema?.indicators || [])];
                  newInds.push({ key: `aspek_${newInds.length + 1}`, label: `Aspek ${newInds.length + 1}`, max_score: 100, weight: 0 });
                  setEditingTemplate({...editingTemplate, rubric_schema: {...editingTemplate.rubric_schema, indicators: newInds}});
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Indikator
              </Button>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="ghost" onClick={() => setEditingTemplate(null)}>Batal</Button>
              <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Simpan Template</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(t => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{t.name}</CardTitle>
                    <CardDescription>{t.type}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingTemplate(t)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2 mt-2">
                  <div className="font-medium text-muted-foreground mb-1">Indikator & Bobot:</div>
                  {t.rubric_schema?.indicators?.map((i:any, idx:number) => (
                    <div key={idx} className="flex justify-between items-center text-xs bg-muted/50 p-2 rounded">
                      <span className="font-medium truncate max-w-[140px]" title={i.label}>{i.label}</span>
                      <span className="text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
                        {i.weight ? `${i.weight}%` : `Max: ${i.max_score}`}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Belum ada template rubrik.</p>
              <Button variant="link" onClick={handleAddNew}>Buat template pertama Anda</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
