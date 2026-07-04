"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";
import { ApiError, AppSetting } from "@/lib/api-helpers";

const loginSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
  password: z.string().min(1, { message: "Password wajib diisi" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  // Fetch if SSO is enabled. WAJIB useEffect (bukan useState initializer) agar
  // tidak ter-eksekusi saat prerender/SSR build — kalau tidak, axios menembak
  // backend saat `next build` dan gagal (ECONNREFUSED) ketika backend belum hidup.
  useEffect(() => {
    api.get("/api/public-settings").then((res) => {
      const data = res.data;
      const ssoSetting = data.find((s: AppSetting) => s.key === "enable_google_sso");
      setSsoEnabled(ssoSetting?.value === "true" || ssoSetting?.value === true || ssoSetting?.value === "1");
    }).catch(console.error);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      // First, get CSRF cookie from Sanctum
      await api.get("/sanctum/csrf-cookie");
      
      // Then perform the login request
      const response = await api.post("/api/auth/login", data);
      
      // Store user info in Zustand
      if (response.data.user) {
        setUser(response.data.user);
        router.push("/dashboard");
      }
    } catch (err) {
      const e = err as ApiError;
      setError(
        e.response?.data?.message || e.response?.data?.errors?.email?.[0] || "Terjadi kesalahan saat login."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Error Alert */}
      {error && (
        <div className="login-error-alert" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Email Field */}
      <div className="space-y-2">
        <label htmlFor="login-email" className="login-label">
          Email
        </label>
        <div className="login-input-wrapper">
          <div className="login-input-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,7 12,13 2,7"/>
            </svg>
          </div>
          <input
            id="login-email"
            type="email"
            placeholder="nama@acms.test"
            autoComplete="email"
            {...register("email")}
            className={`login-input ${errors.email ? "login-input--error" : ""}`}
          />
        </div>
        {errors.email && (
          <p className="login-field-error">{errors.email.message}</p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label htmlFor="login-password" className="login-label">
          Password
        </label>
        <div className="login-input-wrapper">
          <div className="login-input-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
            className={`login-input ${errors.password ? "login-input--error" : ""}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="login-password-toggle"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
        {errors.password && (
          <p className="login-field-error">{errors.password.message}</p>
        )}
        <div className="text-right">
          <Link href="/forgot-password" className="text-xs text-blue-700 hover:underline">
            Lupa password?
          </Link>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="login-submit-btn"
        id="login-submit"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25"/>
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75"/>
            </svg>
            Sedang memproses...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            Masuk
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </span>
        )}
      </button>

      {/* SSO Section */}
      {ssoEnabled && (
        <>
          <div className="login-divider">
            <span className="login-divider-line" />
            <span className="login-divider-text">atau</span>
            <span className="login-divider-line" />
          </div>

          <button
            type="button"
            className="login-sso-btn"
            id="login-sso-google"
            onClick={async () => {
              try {
                const res = await api.get('/api/sso/redirect?provider=google');
                if (res.data.url) {
                  window.location.href = res.data.url;
                }
              } catch (error) {
                setError("SSO sementara tidak tersedia");
              }
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google SSO Universitas
          </button>
        </>
      )}
    </form>
  );
}
