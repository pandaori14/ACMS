"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserCircle, LockKeyhole } from "lucide-react";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [name, setName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put("/api/auth/profile", { name });
      toast.success("Profil berhasil diperbarui.");
      if (res.data.user) setUser(res.data.user);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memperbarui profil."));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.password !== passwordForm.password_confirmation) {
      toast.error("Konfirmasi password tidak sama.");
      return;
    }
    setSavingPassword(true);
    try {
      await api.post("/api/auth/change-password", passwordForm);
      toast.success("Password berhasil diganti.");
      setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal mengganti password."));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profil Saya</h1>
        <p className="text-muted-foreground mt-1">Kelola informasi akun dan keamanan Anda.</p>
      </div>

      <Card className="clean-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-lg">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div>
              <CardTitle className="text-lg">{user?.name}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </div>
            <div className="ml-auto flex gap-1 flex-wrap justify-end">
              {user?.roles?.map((r) => (
                <Badge key={r} variant="secondary">{r}</Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <UserCircle className="w-4 h-4" /> Nama Lengkap
              </label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "Menyimpan..." : "Simpan Profil"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="clean-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <LockKeyhole className="w-5 h-5" /> Ganti Password
          </CardTitle>
          <CardDescription>
            Gunakan password kuat minimal 8 karakter yang tidak dipakai di layanan lain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Password Saat Ini</label>
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Password Baru</label>
                <Input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ulangi Password Baru</label>
                <Input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={passwordForm.password_confirmation}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? "Menyimpan..." : "Ganti Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
