import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    // App memakai basePath /acms — baseUrl HARUS menyertakannya agar
    // cy.visit('/login') → http://localhost:3000/acms/login.
    baseUrl: "http://localhost:3000/acms",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 8000,
    env: {
      // Password akun demo (UserSeeder): {role}@acms.test / password
      demoPassword: "password",
    },
    setupNodeEvents(_on, _config) {
      // node event listeners (opsional)
    },
  },
});
