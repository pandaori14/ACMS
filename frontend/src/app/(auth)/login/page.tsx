import { LoginForm } from "@/components/auth/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Academic Clinical Management System",
  description: "Sign in to your account",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            ACMS
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sistem Manajemen Klinik Akademik
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
