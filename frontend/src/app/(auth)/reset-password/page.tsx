"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LockKeyhole, CheckCircle2, ArrowLeft } from "lucide-react";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const email = params.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await api.post("/api/auth/reset-password", {
        token,
        email,
        password,
        password_confirmation: confirm,
      });
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(getApiErrorMessage(err, "Gagal menyetel password baru."));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tautan Tidak Lengkap</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Buka tautan reset dari email Anda, atau minta tautan baru.
        </p>
        <Link href="/forgot-password" className="text-sm text-blue-700 hover:underline">
          Minta tautan reset baru
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Password Berhasil Diubah</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Mengarahkan ke halaman login...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
          <LockKeyhole className="w-7 h-7 text-blue-900 dark:text-blue-300" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Setel Password Baru</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">untuk akun {email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Password Baru</label>
          <Input
            type="password"
            required
            minLength={8}
            autoFocus
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Ulangi Password Baru</label>
          <Input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white" disabled={isLoading}>
          {isLoading ? "Menyimpan..." : "Simpan Password Baru"}
        </Button>
      </form>

      <p className="mt-6 text-center">
        <Link href="/login" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Kembali ke halaman login
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl border shadow-sm p-8">
        {/* useSearchParams wajib dibungkus Suspense agar prerender Next 15 aman */}
        <Suspense fallback={<p className="text-center text-sm text-gray-500">Memuat...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
