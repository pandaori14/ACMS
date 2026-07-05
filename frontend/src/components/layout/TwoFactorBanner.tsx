"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { ShieldAlert } from "lucide-react";

/**
 * Banner kebijakan enforce_2fa (mode lunak): peran admin yang belum
 * mengaktifkan 2FA diingatkan terus sampai mengaktifkannya.
 */
export function TwoFactorBanner() {
  const user = useAuthStore((state) => state.user);

  if (!user?.must_enable_2fa) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 px-4 py-2 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
      <ShieldAlert className="w-4 h-4 shrink-0" />
      <span>
        Kebijakan keamanan meminta akun Anda mengaktifkan <b>Autentikasi Dua Faktor</b>.
      </span>
      <Link href="/dashboard/profile" className="ml-auto font-semibold underline shrink-0">
        Aktifkan sekarang
      </Link>
    </div>
  );
}
