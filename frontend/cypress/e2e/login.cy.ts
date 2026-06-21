describe('Login Flow', () => {
  it('should display the login page', () => {
    // Visit the base URL (which should redirect to /login if unauthenticated, or we can just visit /login)
    cy.visit('/login');
    
    // Check if the login form is visible
    cy.get('form').should('be.visible');
    
    // Check for email and password inputs
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    
    // Check for the submit button
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('should show validation errors for empty submission', () => {
    cy.visit('/login');
    cy.get('form').submit();
    
    // Wait for validation messages
    // The exact text will depend on our Zod schema
    cy.get('form').should('contain', 'Email');
    cy.get('form').should('contain', 'Password');
  });
});
