/// <reference types="cypress" />
// Custom commands untuk E2E ACMS.
// Akun demo dibuat oleh UserSeeder: {role}@acms.test / password.

export type DemoRole =
  | "superadmin"
  | "adminprodi"
  | "kaprodi"
  | "dosen"
  | "dodiknis"
  | "adminrs"
  | "mahasiswa"
  | "finance";

declare global {
  namespace Cypress {
    interface Chainable {
      /** Login via form nyata (email + password) lalu tunggu sampai /dashboard. */
      login(email: string, password?: string): Chainable<void>;
      /** Login sebagai peran demo, mis. cy.loginAs('mahasiswa'). */
      loginAs(role: DemoRole): Chainable<void>;
    }
  }
}

Cypress.Commands.add("login", (email: string, password?: string) => {
  const pass = password ?? (Cypress.env("demoPassword") as string) ?? "password";
  cy.visit("/login");
  cy.get("#login-email").clear().type(email);
  cy.get("#login-password").clear().type(pass, { log: false });
  cy.get('button[type="submit"]').first().click();
  // Login sukses → diarahkan ke dashboard.
  cy.url({ timeout: 15000 }).should("include", "/dashboard");
});

Cypress.Commands.add("loginAs", (role: DemoRole) => {
  cy.login(`${role}@acms.test`);
});

export {};
