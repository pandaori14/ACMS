"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, MailCheck, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Gagal mengirim permintaan. Coba lagi."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl border shadow-sm p-8">
        {sent ? (
          <div className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
              <MailCheck className="w-7 h-7 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Cek Email Anda</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Jika email <span className="font-medium">{email}</span> terdaftar, tautan reset
              password telah dikirim. Tautan berlaku 60 menit.
            </p>
            <Link href="/login" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">
              <ArrowLeft className="w-4 h-4" /> Kembali ke halaman login
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <KeyRound className="w-7 h-7 text-blue-900 dark:text-blue-300" />
              </div>
              <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Lupa Password?</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Masukkan email akun ACMS Anda — kami kirimkan tautan untuk menyetel password baru.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
                <Input
                  type="email"
                  required
                  autoFocus
                  placeholder="nama@ums.ac.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white" disabled={isLoading}>
                {isLoading ? "Mengirim..." : "Kirim Tautan Reset"}
              </Button>
            </form>

            <p className="mt-6 text-center">
              <Link href="/login" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">
                <ArrowLeft className="w-4 h-4" /> Kembali ke halaman login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
