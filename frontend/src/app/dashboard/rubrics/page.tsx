"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { AssessmentTemplate } from "@/lib/types";
import { Plus, Edit2, Trash2, Save, PlusCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function RubricsPage() {
  const t = useTranslations("assessmentRubrics");
  const tc = useTranslations("common");
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<AssessmentTemplate | null>(null);

  const fetchTemplates = async () => {
    try {
      const res = await api.get("/api/v1/assessments/templates");
      setTemplates(res.data.data || []);
    } catch (err) {
      toast.error(t("fetchError"));
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
      name: t("newTemplate"),
      type: "OSCE",
      is_active: true,
      rubric_schema: {
        max_total_score: 100,
        indicators: [
          { key: "aspek_1", label: t("aspect", { n: 1 }), max_score: 100, weight: 100 }
        ]
      }
    });
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    
    // Validate total weight is 100 if weights are used
    const hasWeight = editingTemplate.rubric_schema?.indicators?.some((i) => i.weight !== undefined);
    if (hasWeight) {
        const totalWeight = editingTemplate.rubric_schema?.indicators?.reduce((acc: number, curr) => acc + (curr.weight || 0), 0);
        if (totalWeight !== 100) {
            toast.error(t("weightError", { total: totalWeight ?? 0 }));
            return;
        }
    }

    try {
      if (editingTemplate.id === "new") {
        const payload: Partial<AssessmentTemplate> = { ...editingTemplate };
        delete payload.id;
        await api.post("/api/v1/assessments/templates", payload);
        toast.success(t("created"));
      } else {
        await api.put(`/api/v1/assessments/templates/${editingTemplate.id}`, editingTemplate);
        toast.success(t("updated"));
      }
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("saveError")));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await api.delete(`/api/v1/assessments/templates/${id}`);
      toast.success(t("deleted"));
      fetchTemplates();
    } catch {
      toast.error(t("deleteError"));
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-1/4" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        {!editingTemplate && (
          <Button onClick={handleAddNew}><Plus className="mr-2 h-4 w-4" /> {t("newTemplate")}</Button>
        )}
      </div>

      {editingTemplate ? (
        <Card className="border-primary/20 shadow-md">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle>{editingTemplate.id === 'new' ? t("createTitle") : t("editTitle")}</CardTitle>
            <CardDescription>{t("cardDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("templateName")}</label>
                <Input
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                  placeholder={t("templateNamePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("examType")}</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editingTemplate.type}
                  onChange={(e) => setEditingTemplate({...editingTemplate, type: e.target.value})}
                >
                  <option value="OSCE">OSCE</option>
                  <option value="Mini-CEX">Mini-CEX</option>
                  <option value="DOPS">DOPS</option>
                  <option value="CBD">CBD</option>
                  <option value="Tugas Ilmiah">{t("typeScientific")}</option>
                  <option value="Ujian Kasus">{t("typeCaseExam")}</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-semibold text-lg">{t("indicators")}</h3>
                <div className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                  {t("totalWeight")}: <span className="font-bold text-foreground">
                    {editingTemplate.rubric_schema?.indicators?.reduce((a: number, b) => a + (Number(b.weight) || 0), 0) || 0}%
                  </span>
                </div>
              </div>

              {editingTemplate.rubric_schema?.indicators?.map((ind, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">{t("indicatorLabel")}</label>
                    <Input 
                      value={ind.label} 
                      onChange={(e) => {
                        const newInds = [...(editingTemplate.rubric_schema?.indicators || [])];
                        newInds[idx].label = e.target.value;
                        newInds[idx].key = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_');
                        setEditingTemplate({...editingTemplate, rubric_schema: {...editingTemplate.rubric_schema, indicators: newInds}});
                      }}
                      placeholder={t("indicatorLabelPlaceholder")}
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <label className="text-xs text-muted-foreground">{t("maxScoreCol")}</label>
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
                    <label className="text-xs text-muted-foreground">{t("weightCol")}</label>
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
                  newInds.push({ key: `aspek_${newInds.length + 1}`, label: t("aspect", { n: newInds.length + 1 }), max_score: 100, weight: 0 });
                  setEditingTemplate({...editingTemplate, rubric_schema: {...editingTemplate.rubric_schema, indicators: newInds}});
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> {t("addIndicator")}
              </Button>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="ghost" onClick={() => setEditingTemplate(null)}>{tc("cancel")}</Button>
              <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> {t("saveTemplate")}</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(tpl => (
            <Card key={tpl.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{tpl.name}</CardTitle>
                    <CardDescription>{tpl.type}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingTemplate(tpl)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(tpl.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2 mt-2">
                  <div className="font-medium text-muted-foreground mb-1">{t("indicatorsWeights")}</div>
                  {tpl.rubric_schema?.indicators?.map((i, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs bg-muted/50 p-2 rounded">
                      <span className="font-medium truncate max-w-[140px]" title={i.label}>{i.label}</span>
                      <span className="text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
                        {i.weight ? `${i.weight}%` : t("maxLabel", { max: i.max_score ?? 0 })}
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
              <p>{t("emptyList")}</p>
              <Button variant="link" onClick={handleAddNew}>{t("createFirst")}</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
