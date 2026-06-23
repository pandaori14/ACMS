"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bot,
  Send,
  Loader2,
  AlertTriangle,
  Sparkles,
  User as UserIcon,
  Trash2,
  BarChart3,
  Users,
  FileText,
  Activity,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiStatus {
  enabled: boolean;
  configured: boolean;
  model: string;
}

const SUGGESTIONS = [
  { icon: Activity, label: "Insiden belum tertangani", prompt: "Berapa laporan insiden yang masih dalam status submitted dan investigating?" },
  { icon: Users, label: "Daftar mahasiswa", prompt: "Tampilkan daftar mahasiswa beserta program studi dan statusnya." },
  { icon: BarChart3, label: "Ringkasan sistem", prompt: "Beri ringkasan jumlah entitas inti sistem (mahasiswa, RS, program, stase, ujian)." },
  { icon: FileText, label: "Draf memo rapat", prompt: "Bantu saya menyusun draf memo undangan rapat koordinasi rotasi klinik minggu depan." },
];

const MARKDOWN_CLASS =
  "text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 " +
  "[&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_li]:my-0.5 [&_strong]:font-semibold [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 " +
  "[&_h3]:font-semibold [&_h3]:mt-2 [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs " +
  "dark:[&_code]:bg-slate-800 [&_a]:text-teal-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-teal-300 [&_blockquote]:pl-3 [&_blockquote]:italic";

export default function AiAssistantPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.roles?.includes("Super Admin") ?? false;

  const [status, setStatus] = useState<AiStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get("/api/ai-assistant/status").then((r) => setStatus(r.data.data)).catch(() => {});
  }, [isSuperAdmin]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  if (!isSuperAdmin) {
    return (
      <div className="py-20 text-center text-muted-foreground">Fitur ini hanya untuk Super Admin.</div>
    );
  }

  const configured = status?.configured ?? false;

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading || !configured) return;
    setError(null);
    const history = messages.slice(-10);
    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post("/api/ai-assistant/chat", { message: content, history });
      setMessages((m) => [...m, { role: "assistant", content: res.data.data.reply }]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Gagal menghubungi AI Assistant."));
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-lg shadow-teal-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">AI Assistant</h1>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {configured ? (
                <>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500" />
                  Aktif · {status?.model}
                </>
              ) : (
                <>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Belum dikonfigurasi
                </>
              )}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setMessages([]); setError(null); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Bersihkan
          </Button>
        )}
      </div>

      {!configured && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            AI Assistant belum aktif/dikonfigurasi. Buka <strong>Pengaturan → AI Assistant</strong> untuk
            mengaktifkan dan memasukkan API key.
          </span>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-5 overflow-y-auto rounded-2xl border bg-gradient-to-b from-slate-50 to-white p-5 dark:from-slate-900/40 dark:to-slate-950"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/40">
              <Bot className="h-7 w-7" />
            </div>
            <p className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-200">
              Halo, {user?.name?.split(" ")[0] || "Admin"} 👋
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Tanyakan kondisi sistem berdasarkan data nyata, atau minta bantuan menyusun draf dokumen.
            </p>
            <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => send(s.prompt)}
                  disabled={!configured}
                  className="group flex items-start gap-3 rounded-xl border bg-white p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:hover:bg-teal-950/20"
                >
                  <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">{s.label}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">{s.prompt}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-2.5 shadow-sm ${
                  m.role === "user"
                    ? "rounded-br-md bg-teal-600 text-sm text-white"
                    : "rounded-bl-md border bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {m.role === "assistant" ? (
                  <div className={MARKDOWN_CLASS}>
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                )}
              </div>
              {m.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  <UserIcon className="h-4 w-4" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border bg-white px-4 py-3 dark:bg-slate-900">
              <span className="h-2 w-2 animate-bounce rounded-full bg-teal-400 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-teal-400 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-teal-400" />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Input */}
      <div className="mt-3 flex items-end gap-2 rounded-2xl border bg-white p-2 shadow-sm focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 dark:bg-slate-900 dark:focus-within:ring-teal-950/40">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={configured ? "Tulis pesan… (Enter kirim · Shift+Enter baris baru)" : "Aktifkan AI di Pengaturan dulu"}
          disabled={loading || !configured}
          className="max-h-40 min-h-[2.5rem] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button
          onClick={() => send()}
          disabled={loading || !input.trim() || !configured}
          className="h-10 w-10 shrink-0 rounded-xl bg-teal-600 p-0 hover:bg-teal-700"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
