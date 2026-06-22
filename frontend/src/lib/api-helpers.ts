/**
 * Tipe & util bersama untuk respons API (selaras Build/API_CONVENTIONS.md).
 * Menggantikan pemakaian `any` pada error-handler dan konsumen settings.
 */

/** Bentuk error Axios yang relevan: server selalu mengirim envelope `{ message }`. */
export interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
}

/**
 * Ambil pesan error dari exception Axios secara aman, dengan fallback.
 * Mengikuti error envelope standar `{ message }`.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as ApiError;
  return e?.response?.data?.message ?? fallback;
}

/** Status HTTP dari error Axios (bila ada). */
export function getApiErrorStatus(err: unknown): number | undefined {
  return (err as ApiError)?.response?.status;
}

/** Satu baris setting dari `/api/settings` & `/api/public-settings` (bentuk flat). */
export interface AppSetting {
  key: string;
  value: string | null;
  group?: string;
  type?: string;
  description?: string | null;
}
