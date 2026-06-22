"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function SsoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const provider = searchParams.get("provider") || "google";

    if (!code) {
      setError("Kode otentikasi tidak ditemukan dari Identity Provider.");
      return;
    }

    const processSso = async () => {
      try {
        const res = await api.get(`/api/v1/sso/callback?provider=${provider}&code=${code}`);
        
        if (res.data.user) {
          setUser(res.data.user);
          toast.success("Login SSO berhasil!");
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("SSO Callback Error:", err);
        setError(getApiErrorMessage(err, "Gagal melakukan verifikasi SSO dengan Universitas."));
        setTimeout(() => router.push("/login"), 3000);
      }
    };

    processSso();
  }, [searchParams, router, setUser]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-900 rounded-xl shadow-lg text-center space-y-6 border border-gray-100 dark:border-gray-800">
        {error ? (
          <>
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">SSO Gagal</h2>
            <p className="text-sm text-red-500">{error}</p>
            <p className="text-xs text-muted-foreground">Mengalihkan kembali ke halaman login...</p>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Memverifikasi SSO...</h2>
            <p className="text-sm text-muted-foreground">
              Sedang menghubungkan profil Anda dengan server Universitas. Mohon tunggu sebentar.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function SsoCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
      </div>
    }>
      <SsoCallbackContent />
    </Suspense>
  );
}
