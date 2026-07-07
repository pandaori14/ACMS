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
import { UserCircle, LockKeyhole, ShieldCheck, Copy, BellRing } from "lucide-react";

interface NotificationPref {
  event_type: string;
  label: string;
  email_enabled: boolean;
}

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

  // ─────── Preferensi notifikasi email ───────
  const [prefs, setPrefs] = useState<NotificationPref[]>([]);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    api
      .get("/api/v1/notification-preferences")
      .then((res) => setPrefs(res.data.data || []))
      .catch(() => {});
  }, []);

  const togglePref = (eventType: string) => {
    setPrefs((prev) =>
      prev.map((p) => (p.event_type === eventType ? { ...p, email_enabled: !p.email_enabled } : p))
    );
  };

  const savePrefs = async () => {
    setSavingPrefs(true);
    try {
      await api.put("/api/v1/notification-preferences", {
        preferences: prefs.map((p) => ({ event_type: p.event_type, email_enabled: p.email_enabled })),
      });
      toast.success("Preferensi notifikasi tersimpan.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menyimpan preferensi."));
    } finally {
      setSavingPrefs(false);
    }
  };

  // ─────── 2FA TOTP ───────
  const [twoFaEnabled, setTwoFaEnabled] = useState<boolean>(!!user?.two_factor_enabled);
  const [setupData, setSetupData] = useState<{ qr_svg: string; secret: string; recovery_codes: string[] } | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [twoFaBusy, setTwoFaBusy] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  const startTwoFa = async () => {
    setTwoFaBusy(true);
    try {
      const res = await api.post("/api/auth/two-factor/enable");
      setSetupData(res.data.data);
      setConfirmCode("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal memulai aktivasi 2FA."));
    } finally {
      setTwoFaBusy(false);
    }
  };

  const confirmTwoFa = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaBusy(true);
    try {
      const res = await api.post("/api/auth/two-factor/confirm", { code: confirmCode });
      toast.success(res.data.message);
      setTwoFaEnabled(true);
      setShowRecovery(true); // recovery codes masih di setupData — tampilkan sekali
      if (user) setUser({ ...user, two_factor_enabled: true, must_enable_2fa: false });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Kode salah — coba lagi."));
    } finally {
      setTwoFaBusy(false);
    }
  };

  const disableTwoFa = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaBusy(true);
    try {
      await api.delete("/api/auth/two-factor", { data: { current_password: disablePassword } });
      toast.success("2FA dinonaktifkan.");
      setTwoFaEnabled(false);
      setSetupData(null);
      setShowRecovery(false);
      setDisablePassword("");
      if (user) setUser({ ...user, two_factor_enabled: false });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Gagal menonaktifkan 2FA."));
    } finally {
      setTwoFaBusy(false);
    }
  };

  const copyRecovery = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.recovery_codes.join("\n"));
    toast.success("Recovery codes disalin.");
  };

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

      {/* Kartu 2FA */}
      <Card className="clean-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" /> Autentikasi Dua Faktor (2FA)
          </CardTitle>
          <CardDescription>
            Lapisan keamanan ekstra: login membutuhkan kode 6 digit dari aplikasi authenticator
            (Google Authenticator, Microsoft Authenticator, Aegis, dll).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {twoFaEnabled ? (
            <>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-700">AKTIF</Badge>
                <span className="text-sm text-muted-foreground">
                  Akun Anda dilindungi 2FA.
                </span>
              </div>

              {showRecovery && setupData && (
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    SIMPAN recovery codes ini — hanya ditampilkan SEKALI:
                  </p>
                  <div className="grid grid-cols-2 gap-1 font-mono text-sm">
                    {setupData.recovery_codes.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={copyRecovery}>
                    <Copy className="w-4 h-4 mr-1" /> Salin Semua
                  </Button>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Gunakan salah satu kode ini (sekali pakai) bila kehilangan akses ke authenticator.
                  </p>
                </div>
              )}

              <form onSubmit={disableTwoFa} className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <div className="space-y-1 flex-1 max-w-xs">
                  <label className="text-sm font-medium">Nonaktifkan — masukkan password</label>
                  <Input
                    type="password"
                    required
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="outline" className="text-red-600" disabled={twoFaBusy}>
                  Nonaktifkan 2FA
                </Button>
              </form>
            </>
          ) : setupData ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <img
                  src={setupData.qr_svg}
                  alt="QR 2FA"
                  className="w-44 h-44 border rounded-md bg-white p-1 shrink-0"
                />
                <div className="space-y-2 text-sm">
                  <p className="font-medium">1. Pindai QR dengan aplikasi authenticator</p>
                  <p className="text-muted-foreground">
                    Atau masukkan manual: <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{setupData.secret}</code>
                  </p>
                  <form onSubmit={confirmTwoFa} className="space-y-2 pt-2">
                    <p className="font-medium">2. Masukkan kode 6 digit untuk konfirmasi</p>
                    <div className="flex gap-2">
                      <Input
                        required
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        placeholder="123456"
                        className="w-32 font-mono text-center tracking-widest"
                        value={confirmCode}
                        onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
                      />
                      <Button type="submit" disabled={twoFaBusy || confirmCode.length !== 6}>
                        {twoFaBusy ? "Memeriksa..." : "Aktifkan"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Nonaktif</Badge>
                {user?.must_enable_2fa && (
                  <span className="text-sm text-amber-600 font-medium">
                    Kebijakan sistem meminta peran Anda mengaktifkan 2FA.
                  </span>
                )}
              </div>
              <Button onClick={startTwoFa} disabled={twoFaBusy} className="bg-blue-900 hover:bg-blue-800 text-white">
                {twoFaBusy ? "Menyiapkan..." : "Aktifkan 2FA"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferensi notifikasi email */}
      {prefs.length > 0 && (
        <Card className="clean-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BellRing className="w-5 h-5" /> Preferensi Notifikasi Email
            </CardTitle>
            <CardDescription>
              Pilih email otomatis mana yang ingin Anda terima. Notifikasi lonceng in-app dan
              email keamanan akun (reset password) tetap selalu aktif.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {prefs.map((p) => (
                <label
                  key={p.event_type}
                  className="flex items-center gap-2 rounded-md border p-2.5 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={p.email_enabled}
                    onChange={() => togglePref(p.event_type)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
            <Button onClick={savePrefs} disabled={savingPrefs} className="bg-blue-900 hover:bg-blue-800 text-white">
              {savingPrefs ? "Menyimpan..." : "Simpan Preferensi"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
