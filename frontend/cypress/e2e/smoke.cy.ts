/// <reference types="cypress" />
// Smoke E2E: tiap peran demo bisa login, mencapai dashboard, dan melihat
// menu yang sesuai hak aksesnya (sidebar permission-driven). Jaring pengaman
// regresi lintas frontend+backend. Butuh stack lokal berjalan + `migrate --seed`.
import type { DemoRole } from "../support/commands";

// Peran → satu label menu khas yang WAJIB tampil untuknya.
const roleMenus: Array<{ role: DemoRole; menu: string }> = [
  { role: "superadmin", menu: "Pengaturan Sistem" },
  { role: "adminprodi", menu: "Manajemen Stase" },
  { role: "kaprodi", menu: "Kelayakan Yudisium" },
  { role: "dodiknis", menu: "Verifikasi Logbook" },
  { role: "mahasiswa", menu: "Logbook Klinis" },
  { role: "finance", menu: "Tagihan RS" },
];

describe("Smoke — login & menu per peran", () => {
  roleMenus.forEach(({ role, menu }) => {
    it(`${role}: login → dashboard → melihat "${menu}"`, () => {
      cy.loginAs(role);
      cy.url().should("include", "/dashboard");
      cy.contains(menu, { timeout: 10000 }).should("exist");
    });
  });
});

describe("Smoke — halaman kunci termuat", () => {
  it("mahasiswa membuka Logbook, Presensi, Transkrip tanpa error fatal", () => {
    cy.loginAs("mahasiswa");
    ["/dashboard/clinical/logbook", "/dashboard/clinical/attendance", "/dashboard/my-grades"].forEach(
      (path) => {
        cy.visit(path);
        cy.get("body").should("be.visible");
        cy.url().should("include", path);
      }
    );
  });

  it("admin prodi membuka Rotasi, Pusat Laporan, Kalender Akademik", () => {
    cy.loginAs("adminprodi");
    ["/dashboard/rotations", "/dashboard/reports", "/dashboard/academic/calendar"].forEach((path) => {
      cy.visit(path);
      cy.get("body").should("be.visible");
      cy.url().should("include", path);
    });
  });
});
