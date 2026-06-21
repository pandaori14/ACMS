import { UsersClient } from "./UsersClient";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manajemen Pengguna</h1>
        <p className="text-muted-foreground mt-2">
          Kelola data Mahasiswa, Preceptor (Dodiknis), dan Admin Sistem.
        </p>
      </div>

      <UsersClient />
    </div>
  );
}
