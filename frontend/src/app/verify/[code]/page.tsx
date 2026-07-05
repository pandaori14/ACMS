"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { ShieldCheck, ShieldX, Loader2 } from "lucide-react";

interface VerifyResult {
  valid: boolean;
  type?: string;
  name?: string | null;
  nim_masked?: string | null;
  program?: string | null;
  average?: number | null;
  stase_count?: number | null;
  generated_at?: string | null;
}

/**
 * Halaman PUBLIK verifikasi keaslian dokumen (dibuka dari QR di PDF).
 * Tanpa login — hanya menampilkan data ringkas yang sudah disamarkan.
 */
export default function VerifyDocumentPage() {
  const params = useParams();
  const code = typeof params.code === "string" ? params.code : "";

  const [result, setResult] = useState<VerifyResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!code) {
      setIsLoading(false);
      return;
    }
    api.get(`/api/public/verify-document/${code}`)
      .then((res) => setResult(res.data))
      .catch(() => setResult({ valid: false }))
      .finally(() => setIsLoading(false));
  }, [code]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <p className="text-sm font-semibold tracking-widest text-blue-900 dark:text-blue-300">
            ACMS — FK UMS
          </p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            Verifikasi Keaslian Dokumen
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm p-8">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-8 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Memeriksa dokumen...</p>
            </div>
          ) : result?.valid ? (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                  <ShieldCheck className="w-9 h-9 text-emerald-600" />
                </div>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  DOKUMEN ASLI
                </p>
                <p className="text-xs text-gray-500">
                  Diterbitkan resmi oleh sistem ACMS Fakultas Kedokteran UMS
                </p>
              </div>

              <dl className="divide-y text-sm">
                <div className="flex justify-between py-2">
                  <dt className="text-gray-500">Jenis Dokumen</dt>
                  <dd className="font-medium">Transkrip Klinis Resmi</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-gray-500">Atas Nama</dt>
                  <dd className="font-medium">{result.name || "-"}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-gray-500">NIM</dt>
                  <dd className="font-mono">{result.nim_masked || "-"}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-gray-500">Program Studi</dt>
                  <dd className="font-medium">{result.program || "-"}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-gray-500">Rata-rata Nilai</dt>
                  <dd className="font-bold text-blue-900 dark:text-blue-300">
                    {result.average ?? "-"}{result.stase_count != null ? ` (${result.stase_count} stase)` : ""}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-gray-500">Diterbitkan</dt>
                  <dd>
                    {result.generated_at
                      ? new Date(result.generated_at).toLocaleString("id-ID", {
                          day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })
                      : "-"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center">
                <ShieldX className="w-9 h-9 text-red-600" />
              </div>
              <p className="text-lg font-bold text-red-700 dark:text-red-400">
                DOKUMEN TIDAK DITEMUKAN
              </p>
              <p className="text-sm text-gray-500 max-w-xs">
                Kode verifikasi tidak valid atau dokumen tidak diterbitkan oleh sistem ini.
                Waspadai kemungkinan pemalsuan dokumen.
              </p>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Academic Clinical Management System — Universitas Muhammadiyah Surakarta
        </p>
      </div>
    </div>
  );
}
