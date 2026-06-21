"use client";

import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

type SystemReference = {
  id: string;
  category: string;
  name: string;
  value: string;
  is_active: boolean;
};

export default function ReferencesClient() {
  const [references, setReferences] = useState<SystemReference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: "",
    name: "",
    value: "",
    is_active: true,
  });

  const fetchReferences = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/v1/system-references');
      setReferences(res.data);
    } catch (error: any) {
      toast.error("Gagal memuat data referensi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferences();
  }, []);

  const handleOpenDialog = (ref?: SystemReference) => {
    if (ref) {
      setEditingId(ref.id);
      setFormData({
        category: ref.category,
        name: ref.name,
        value: ref.value,
        is_active: ref.is_active,
      });
    } else {
      setEditingId(null);
      setFormData({
        category: "",
        name: "",
        value: "",
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/v1/system-references/${editingId}`, formData);
        toast.success("Referensi berhasil diperbarui.");
      } else {
        await api.post('/v1/system-references', formData);
        toast.success("Referensi baru berhasil ditambahkan.");
      }
      setIsDialogOpen(false);
      fetchReferences();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Gagal menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus referensi ini?")) return;
    try {
      await api.delete(`/v1/system-references/${id}`);
      toast.success("Referensi berhasil dihapus.");
      fetchReferences();
    } catch (error: any) {
      toast.error("Gagal menghapus data.");
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/v1/system-references/${id}`, { is_active: !currentStatus });
      toast.success("Status berhasil diperbarui.");
      fetchReferences();
    } catch (error: any) {
      toast.error("Gagal memperbarui status.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Daftar Referensi Master</h2>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Referensi
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kategori</TableHead>
              <TableHead>Nama Tampilan (Name)</TableHead>
              <TableHead>Nilai Sistem (Value)</TableHead>
              <TableHead>Status Aktif</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : references.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                  Belum ada data referensi.
                </TableCell>
              </TableRow>
            ) : (
              references.map((ref) => (
                <TableRow key={ref.id}>
                  <TableCell className="font-medium">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs">
                      {ref.category}
                    </span>
                  </TableCell>
                  <TableCell>{ref.name}</TableCell>
                  <TableCell className="font-mono text-xs">{ref.value}</TableCell>
                  <TableCell>
                    <Switch 
                      checked={ref.is_active} 
                      onCheckedChange={() => handleToggleActive(ref.id, ref.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(ref)}>
                      <Edit className="w-4 h-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(ref.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Referensi" : "Tambah Referensi Baru"}</DialogTitle>
            <DialogDescription>
              Isi formulir di bawah ini untuk mengelola referensi sistem.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Kategori (Category)</Label>
              <Input 
                id="category" 
                placeholder="Contoh: incident_types" 
                value={formData.category} 
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                required 
              />
              <p className="text-xs text-muted-foreground">Kelompok referensi (harus sama untuk item yang sejenis).</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Tampilan (Name)</Label>
              <Input 
                id="name" 
                placeholder="Contoh: Kekerasan Seksual" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required 
              />
              <p className="text-xs text-muted-foreground">Teks yang akan dibaca oleh *User* di *Dropdown*.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Nilai Sistem (Value)</Label>
              <Input 
                id="value" 
                placeholder="Contoh: sexual_harassment" 
                value={formData.value} 
                onChange={(e) => setFormData({...formData, value: e.target.value})}
                required 
              />
              <p className="text-xs text-muted-foreground">Nilai unik untuk diolah di *database* (tanpa spasi, gunakan *underscore*).</p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label>Status Aktif</Label>
                <p className="text-xs text-muted-foreground">Apakah referensi ini dapat dipilih oleh *User*?</p>
              </div>
              <Switch 
                checked={formData.is_active} 
                onCheckedChange={(c) => setFormData({...formData, is_active: c})}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
