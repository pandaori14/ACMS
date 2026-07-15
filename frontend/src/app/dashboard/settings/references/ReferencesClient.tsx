"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { getApiErrorMessage } from "@/lib/api-helpers";
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
  const t = useTranslations("settingsReferences");
  const tc = useTranslations("common");
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
    } catch {
      toast.error(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sekali saat mount
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
        toast.success(t("updateSuccess"));
      } else {
        await api.post('/v1/system-references', formData);
        toast.success(t("createSuccess"));
      }
      setIsDialogOpen(false);
      fetchReferences();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("saveError")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await api.delete(`/v1/system-references/${id}`);
      toast.success(t("deleteSuccess"));
      fetchReferences();
    } catch {
      toast.error(t("deleteError"));
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/v1/system-references/${id}`, { is_active: !currentStatus });
      toast.success(t("statusSuccess"));
      fetchReferences();
    } catch {
      toast.error(t("statusError"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{t("listTitle")}</h2>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> {t("addRef")}
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colCategory")}</TableHead>
              <TableHead>{t("colName")}</TableHead>
              <TableHead>{t("colValue")}</TableHead>
              <TableHead>{t("colActive")}</TableHead>
              <TableHead className="text-right">{t("colActions")}</TableHead>
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
                  {t("empty")}
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
            <DialogTitle>{editingId ? t("editTitle") : t("addTitle")}</DialogTitle>
            <DialogDescription>
              {t("dialogDesc")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">{t("categoryLabel")}</Label>
              <Input
                id="category"
                placeholder={t("categoryPlaceholder")}
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                required
              />
              <p className="text-xs text-muted-foreground">{t("categoryHelp")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t("nameLabel")}</Label>
              <Input
                id="name"
                placeholder={t("namePlaceholder")}
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
              <p className="text-xs text-muted-foreground">{t("nameHelp")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">{t("valueLabel")}</Label>
              <Input
                id="value"
                placeholder={t("valuePlaceholder")}
                value={formData.value}
                onChange={(e) => setFormData({...formData, value: e.target.value})}
                required
              />
              <p className="text-xs text-muted-foreground">{t("valueHelp")}</p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label>{t("activeLabel")}</Label>
                <p className="text-xs text-muted-foreground">{t("activeHelp")}</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(c) => setFormData({...formData, is_active: c})}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {tc("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
