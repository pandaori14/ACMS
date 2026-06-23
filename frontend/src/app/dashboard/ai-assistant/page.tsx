"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Bot, Send, Loader2, AlertTriangle, Sparkles, User as UserIcon } from "lucide-react";
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
      <div className="py-20 text-center text-muted-foreground">
        Fitur ini hanya untuk Super Admin.
      </div>
    );
  }

  const configured = status?.configured ?? false;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    const history = messages.slice(-10);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post("/api/ai-assistant/chat", { message: text, history });
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
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">AI Assistant</h1>
          <p className="text-sm text-muted-foreground">
            {configured ? `Aktif · model: ${status?.model}` : "Belum dikonfigurasi"}
          </p>
        </div>
      </div>

      {!configured && (
        <Card className="mb-4 flex items-start gap-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            AI Assistant belum aktif/dikonfigurasi. Buka <strong>Pengaturan → AI Assistant</strong> untuk
            mengaktifkan dan memasukkan API key.
          </span>
        </Card>
      )}

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-xl border bg-muted/20 p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <Bot className="mb-3 h-10 w-10 opacity-40" />
            <p className="max-w-sm text-sm">
              Tanyakan status sistem (mis. &quot;berapa insiden yang belum ditangani?&quot;) atau minta bantuan
              menyusun draf memo/laporan.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user" ? "bg-blue-600 text-white" : "border bg-white dark:bg-slate-900"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
            </div>
            {m.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                <UserIcon className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> AI sedang menyusun jawaban…
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder={configured ? "Tulis pesan… (Enter kirim · Shift+Enter baris baru)" : "Aktifkan AI di Pengaturan dulu"}
          disabled={loading || !configured}
          className="resize-none"
        />
        <Button onClick={send} disabled={loading || !input.trim() || !configured} className="h-11">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
