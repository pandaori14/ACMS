"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Stase } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Database, Download, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BankOption {
  option_text: string;
  is_correct: boolean;
}

interface BankItem {
  id: string;
  stase_id?: string | null;
  topic?: string | null;
  difficulty?: string | null;
  question_text: string;
  options: BankOption[];
  points: number;
  stase?: { name?: string } | null;
  creator?: { name?: string } | null;
}

interface ReferenceItem {
  id: string;
  name: string;
  value: string;
}

const EMPTY_OPTIONS: BankOption[] = [
  { option_text: "", is_correct: true },
  { option_text: "", is_correct: false },
  { option_text: "", is_correct: false },
  { option_text: "", is_correct: false },
];

const DIFF_BADGE: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  hard: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const selectClass =
  "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background";

export default function QuestionBankPage() {
  const [items, setItems] = useState<BankItem[]>([]);
  const [stases, setStases] = useState<Stase[]>([]);
  const [difficulties, setDifficulties] = useState<ReferenceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterStase, setFilterStase] = useState("");
  const [filterDiff, setFilterDiff] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0 });

  // Form soal
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [qText, setQText] = useState("");
  const [qStase, setQStase] = useState("");
  const [qTopic, setQTopic] = useState("");
  const [qDiff, setQDiff] = useState("");
  const [qPoints, setQPoints] = useState(1);
  const [options, setOptions] = useState<BankOption[]>(EMPTY_OPTIONS);
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState<BankItem | null>(null);

  // Import
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStase, setImportStase] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/api/v1/examinations/question-bank", {
        params: {
          page,
          ...(search ? { search } : {}),
          ...(filterStase ? { stase_id: filterStase } : {}),
          ...(filterDiff ? { difficulty: filterDiff } : {}),
        },
      });
      setItems(res.data.data || []);
      setMeta(res.data.meta || { last_page: 1, total: 0 });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memuat bank soal."));
    } finally {
      setIsLoading(false);
    }
  }, [page, search, filterStase, filterDiff]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    api.get("/api/v1/academic/stase").then((res) => setStases(res.data.data || res.data)).catch(() => {});
    api.get("/api/references/question_difficulties").then((res) => setDifficulties(res.data.data || [])).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setQText("");
    setQStase("");
    setQTopic("");
    setQDiff("");
    setQPoints(1);
    setOptions(EMPTY_OPTIONS.map((o) => ({ ...o })));
    setIsOpen(true);
  };

  const openEdit = (item: BankItem) => {
    setEditingId(item.id);
    setQText(item.question_text);
    setQStase(item.stase_id || "");
    setQTopic(item.topic || "");
    setQDiff(item.difficulty || "");
    setQPoints(item.points);
    setOptions(item.options.map((o) => ({ ...o })));
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filled = options.filter((o) => o.option_text.trim() !== "");
    if (filled.length < 2 || filled.filter((o) => o.is_correct).length !== 1) {
      toast.error("Minimal 2 opsi terisi dan tepat SATU ditandai benar.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        question_text: qText,
        stase_id: qStase || null,
        topic: qTopic || null,
        difficulty: qDiff || null,
        points: qPoints,
        options: filled,
      };
      if (editingId) {
        await api.put(`/api/v1/examinations/question-bank/${editingId}`, payload);
        toast.success("Soal bank diperbarui.");
      } else {
        await api.post("/api/v1/examinations/question-bank", payload);
        toast.success("Soal ditambahkan ke bank.");
      }
      setIsOpen(false);
      fetchItems();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan soal."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/api/v1/examinations/question-bank/${deleting.id}`);
      toast.success("Soal bank dihapus.");
      fetchItems();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menghapus soal."));
    } finally {
      setDeleting(null);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setIsImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      if (importStase) fd.append("stase_id", importStase);
      const res = await api.post("/api/v1/examinations/question-bank/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data.message);
      setIsImportOpen(false);
      fetchItems();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Import gagal diproses."));
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get("/api/v1/examinations/question-bank/import-template", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template-import-bank-soal.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Gagal mengunduh template.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Soal</h1>
          <p className="text-muted-foreground mt-1">
            Kumpulan soal reusable lintas ujian CBT. Memakai soal = menyalin ke ujian, sehingga
            riwayat ujian lama tidak berubah saat bank diedit.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Import
          </Button>
          <Button onClick={openCreate} className="bg-blue-900 hover:bg-blue-800 text-white">
            <Plus className="w-4 h-4 mr-2" /> Tambah Soal
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari soal / topik..."
            className="pl-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className={selectClass} value={filterStase} onChange={(e) => { setFilterStase(e.target.value); setPage(1); }}>
          <option value="">Semua Stase</option>
          {stases.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className={selectClass} value={filterDiff} onChange={(e) => { setFilterDiff(e.target.value); setPage(1); }}>
          <option value="">Semua Kesulitan</option>
          {difficulties.map((d) => <option key={d.id} value={d.value}>{d.name}</option>)}
        </select>
      </div>

      <div className="rounded-md border bg-white dark:bg-gray-900 overflow-x-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Soal</TableHead>
              <TableHead>Stase</TableHead>
              <TableHead>Topik</TableHead>
              <TableHead>Kesulitan</TableHead>
              <TableHead>Poin</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-10">Memuat...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Database className="w-10 h-10 text-slate-300" />
                    <p className="text-sm text-slate-500">Bank soal masih kosong.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[320px]">
                    <span className="text-sm line-clamp-2" title={item.question_text}>{item.question_text}</span>
                    <span className="block text-xs text-slate-400">{item.options.length} opsi</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{item.stase?.name || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{item.topic || "—"}</TableCell>
                  <TableCell>
                    {item.difficulty ? (
                      <Badge className={DIFF_BADGE[item.difficulty] || "bg-slate-100 text-slate-600"}>
                        {difficulties.find((d) => d.value === item.difficulty)?.name || item.difficulty}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{item.points}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)} aria-label="Edit">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeleting(item)} aria-label="Hapus">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta.total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Total {meta.total} soal</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
            <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>Berikutnya</Button>
          </div>
        </div>
      )}

      {/* Dialog soal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Soal Bank" : "Tambah Soal ke Bank"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Teks Soal</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                maxLength={5000}
                value={qText}
                onChange={(e) => setQText(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Stase (opsional)</label>
                <select className={`${selectClass} w-full`} value={qStase} onChange={(e) => setQStase(e.target.value)}>
                  <option value="">—</option>
                  {stases.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kesulitan</label>
                <select className={`${selectClass} w-full`} value={qDiff} onChange={(e) => setQDiff(e.target.value)}>
                  <option value="">—</option>
                  {difficulties.map((d) => <option key={d.id} value={d.value}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Topik</label>
                <Input maxLength={100} value={qTopic} onChange={(e) => setQTopic(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Poin</label>
                <Input type="number" min={1} max={100} value={qPoints} onChange={(e) => setQPoints(Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Opsi Jawaban (pilih satu yang benar)</label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={opt.is_correct}
                    onChange={() =>
                      setOptions(options.map((o, j) => ({ ...o, is_correct: j === i })))
                    }
                    aria-label={`Opsi ${i + 1} benar`}
                  />
                  <Input
                    placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                    value={opt.option_text}
                    onChange={(e) =>
                      setOptions(options.map((o, j) => (j === i ? { ...o, option_text: e.target.value } : o)))
                    }
                  />
                </div>
              ))}
              {options.length < 6 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, { option_text: "", is_correct: false }])}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Opsi
                </Button>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog import */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Soal dari Excel/CSV</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleImport} className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Heading kolom: <code className="text-xs">question, option_a..option_e, correct (a-e), points, topic, difficulty</code>
            </p>
            <Button type="button" variant="link" size="sm" className="px-0" onClick={downloadTemplate}>
              <Download className="w-3.5 h-3.5 mr-1" /> Unduh template
            </Button>
            <div className="space-y-2">
              <label className="text-sm font-medium">Stase default (opsional)</label>
              <select className={`${selectClass} w-full`} value={importStase} onChange={(e) => setImportStase(e.target.value)}>
                <option value="">—</option>
                {stases.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              required
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
            <Button type="submit" className="w-full" disabled={isImporting || !importFile}>
              {isImporting ? "Mengimpor..." : "Import"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Soal Bank?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
            {deleting?.question_text}
          </p>
          <p className="text-xs text-slate-400">Ujian yang sudah menyalin soal ini tidak terpengaruh.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>Hapus</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
