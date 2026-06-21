describe('Preceptor Workflow', () => {
  beforeEach(() => {
    // Intercept API calls to mock backend responses
    cy.intercept('GET', '**/api/v1/clinical/preceptor/dashboard-stats', {
      statusCode: 200,
      body: {
        data: {
          assigned_students: 5,
          pending_logbooks: 2,
          total_assessments: 10
        }
      }
    }).as('getStats');

    cy.intercept('GET', '**/api/v1/clinical/logbooks?pending_verification=true', {
      statusCode: 200,
      body: {
        data: [
          {
            id: 'mock-logbook-1',
            activity_date: '2026-06-11',
            activity_type: 'case',
            description: 'Penanganan Pasien DBD',
            status: 'submitted',
            student: { user: { name: 'Budi Santoso' } },
            rotationAssignment: { stase: { name: 'Ilmu Penyakit Dalam' } }
          }
        ]
      }
    }).as('getPendingLogbooks');

    cy.intercept('PATCH', '**/api/v1/clinical/logbooks/mock-logbook-1/verify', {
      statusCode: 200,
      body: { message: 'Verified' }
    }).as('verifyLogbook');

    window.localStorage.setItem('acms_token', 'mock-jwt-token-preceptor');
  });

  it('should display the preceptor dashboard stats', () => {
    cy.visit('/dashboard/preceptor');
    cy.wait('@getStats');

    cy.contains('Dasbor Preceptor').should('be.visible');
    cy.contains('5').should('be.visible'); // students
    cy.contains('2').should('be.visible'); // pending logbooks
    cy.contains('10').should('be.visible'); // assessments
  });

  it('should allow preceptor to verify a logbook', () => {
    cy.visit('/dashboard/preceptor/logbook-verification');
    cy.wait('@getPendingLogbooks');

    cy.contains('Budi Santoso').should('be.visible');
    cy.contains('Penanganan Pasien DBD').should('be.visible');

    // Click Verify
    cy.contains('Verifikasi').click();
    cy.wait('@verifyLogbook');

    // Toast success
    cy.contains('Logbook berhasil diverifikasi').should('be.visible');
  });
});
