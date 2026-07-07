/// <reference types="cypress" />

describe("Login", () => {
  it("menampilkan form login", () => {
    cy.visit("/login");
    cy.get("form").should("be.visible");
    cy.get("#login-email").should("be.visible");
    cy.get("#login-password").should("be.visible");
    cy.get('button[type="submit"]').should("be.visible");
  });

  it("menolak kredensial salah", () => {
    cy.visit("/login");
    cy.get("#login-email").type("bukan@acms.test");
    cy.get("#login-password").type("passwordsalah");
    cy.get('button[type="submit"]').first().click();
    // Tetap di halaman login (tidak masuk dashboard).
    cy.url().should("not.include", "/dashboard");
  });

  it("berhasil login sebagai Super Admin", () => {
    cy.loginAs("superadmin");
    cy.contains("Dashboard").should("exist");
  });
});
