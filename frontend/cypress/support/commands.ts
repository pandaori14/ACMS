// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login a user by identifier and password.
       */
      login(identifier: string, password?: string): Chainable<void>
    }
  }
}

Cypress.Commands.add('login', (identifier, password = 'password') => {
  cy.visit('/login');
  cy.get('input[type="text"]').clear().type(identifier);
  cy.get('input[type="password"]').clear().type(password);
  cy.get('button[type="submit"]').click();
  // Wait until dashboard is reached
  cy.url().should('include', '/dashboard');
})

export {};
