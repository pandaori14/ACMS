describe('Clinical Rotation Attendance', () => {
  const mockHospitalLocation = {
    latitude: -7.7699,
    longitude: 110.3779,
  };

  const mockInsideRadius = {
    coords: {
      latitude: -7.76991,
      longitude: 110.37791,
      accuracy: 10,
    },
  };

  const mockOutsideRadius = {
    coords: {
      latitude: -6.2088, // Jakarta
      longitude: 106.8456,
      accuracy: 10,
    },
  };

  beforeEach(() => {
    // Intercept API calls to mock backend responses
    cy.intercept('GET', '**/api/v1/clinical/attendance/status', {
      statusCode: 200,
      body: {
        rotation: {
          id: 'mock-rotation-id',
          hospital: {
            name: 'RS UGM',
            latitude: mockHospitalLocation.latitude,
            longitude: mockHospitalLocation.longitude,
          }
        },
        attendance: null,
        can_check_in: true,
        can_check_out: false
      }
    }).as('getAttendanceStatus');

    cy.intercept('POST', '**/api/v1/clinical/attendance/check-in', (req) => {
      // Simulate backend radius validation
      const lat = req.body.latitude;
      // Simple validation for mock purposes
      if (lat === mockInsideRadius.coords.latitude) {
        req.reply({
          statusCode: 200,
          body: {
            message: 'Check-in berhasil!',
            data: {
              status: 'PRESENT',
              check_in_time: '08:00:00'
            }
          }
        });
      } else {
        req.reply({
          statusCode: 403,
          body: {
            error: 'Anda berada di luar radius Rumah Sakit.'
          }
        });
      }
    }).as('checkIn');

    // Assuming user is already logged in for this test
    // For a real E2E, we might login first or use cy.session()
    window.localStorage.setItem('acms_token', 'mock-jwt-token');
    
    // Visit the attendance page
    cy.visit('/dashboard/clinical/attendance');
  });

  it('should display the current hospital location and allow check-in within radius', () => {
    // Wait for status to load
    cy.wait('@getAttendanceStatus');

    cy.contains('RS UGM').should('be.visible');

    // Mock geolocation to be INSIDE radius
    cy.window().then((win) => {
      cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((cb) => {
        return cb(mockInsideRadius);
      });
    });

    // Click check-in button
    cy.get('button').contains('Check In', { matchCase: false }).click();

    cy.wait('@checkIn');

    // Should show success message
    cy.contains('Check-in berhasil!').should('be.visible');
  });

  it('should show error when checking in outside radius', () => {
    cy.wait('@getAttendanceStatus');

    // Mock geolocation to be OUTSIDE radius
    cy.window().then((win) => {
      cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((cb) => {
        return cb(mockOutsideRadius);
      });
    });

    // Click check-in button
    cy.get('button').contains('Check In', { matchCase: false }).click();

    cy.wait('@checkIn');

    // Should show error message
    cy.contains('luar radius').should('be.visible');
  });
});
