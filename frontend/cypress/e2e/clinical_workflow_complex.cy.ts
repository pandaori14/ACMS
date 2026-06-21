describe("Clinical Workflow Complex (Multi-Role)", () => {
  beforeEach(() => {
    // We clear localStorage to ensure clean state
    cy.clearLocalStorage();
  });

  it("Phase 1: Student Activity (Attendance, Logbook, Evaluation, Incident)", () => {
    // 1. Login as Student
    cy.login("MHS001");
    cy.get("h2").contains("ACMS").should("be.visible");

    // 2. Attendance (Clock In)
    cy.visit("/dashboard/rotations");
    cy.contains("Jadwal Rotasi").should("be.visible");
    cy.get("button").contains("Clock In").click();
    cy.contains("berhasil direkam").should("be.visible");

    // 3. Fill Logbook with ICD-10
    cy.visit("/dashboard/clinical/logbooks");
    cy.contains("Logbook Klinis").should("be.visible");
    cy.get("button").contains("Tambah Entri").click();
    
    // Select patient
    cy.get('button:contains("Pilih Pasien")').first().click();
    cy.get('[role="option"]').first().click();
    
    // Search ICD-10
    cy.get('input[placeholder*="Ketik nama penyakit"]').type("Cholera");
    cy.get('[role="option"]').contains("A00").click();
    
    // Search Procedure
    cy.get('input[placeholder*="Ketik nama prosedur"]').type("Biopsy");
    cy.get('[role="option"]').first().click();

    cy.get("textarea").type("Observasi pasien dengan gejala dehidrasi.");
    cy.get('button[type="submit"]').contains("Simpan Logbook").click();
    cy.contains("berhasil disimpan").should("be.visible");

    // 4. Incident Report (Anonymous)
    cy.visit("/dashboard/incidents/report");
    cy.contains("Pelaporan Insiden").should("be.visible");
    
    cy.get('button:contains("Pilih Jenis Insiden")').click();
    cy.get('[role="option"]').contains("Bullying").click();
    
    cy.get('input[type="date"]').type("2026-06-12");
    cy.get('input[id="location"]').type("Ruang Jaga IGD");
    cy.get("textarea").type("Terjadi perundungan verbal oleh pihak yang tidak dikenal.");
    
    // Check anonymous
    cy.get('input[id="is_anonymous"]').check();
    cy.get('button[type="submit"]').contains("Kirim Laporan").click();
    cy.contains("Laporan Diterima").should("be.visible");

    // 5. Evaluation for Preceptor
    cy.visit("/dashboard/clinical/evaluations");
    cy.contains("Kuesioner Evaluasi").should("be.visible");
    
    // Click 5 stars
    cy.get('button > svg').last().click(); 
    cy.get('button[type="submit"]:contains("Submit Evaluasi")').click();
    cy.contains("Evaluasi Selesai").should("be.visible");

    // 6. Logout
    cy.get('button:contains("Logout")').click();
    cy.url().should("include", "/login");
  });

  it("Phase 2: Preceptor Activity (Verify Logbook, Assess Student)", () => {
    // 7. Login as Preceptor
    cy.login("PRE001");
    cy.get("h2").contains("ACMS").should("be.visible");

    // 8. Verify Logbook
    cy.visit("/dashboard/clinical/verification");
    cy.contains("Verifikasi Logbook").should("be.visible");
    cy.get('button:contains("Detail")').first().click();
    cy.get('button:contains("Approve")').click();
    cy.contains("berhasil").should("be.visible");

    // 9. Assess via Mini-CEX
    cy.visit("/dashboard/assessments/create");
    cy.contains("Form Penilaian Klinis").should("be.visible");
    
    cy.get('button:contains("Pilih Mahasiswa")').click();
    cy.get('[role="option"]').contains("MHS001").click();

    cy.get('button:contains("Pilih Instrumen")').click();
    cy.get('[role="option"]').contains("Mini-CEX").click();

    // Fill scores
    cy.get('input[type="number"]').each(($el) => {
      cy.wrap($el).clear().type("85");
    });
    cy.get("textarea").type("Perkembangan mahasiswa sangat baik.");

    cy.get('button[type="submit"]').contains("Simpan Penilaian").click();
    cy.contains("berhasil disimpan").should("be.visible");

    // 10. Logout
    cy.get('button:contains("Logout")').click();
    cy.url().should("include", "/login");
  });

  it("Phase 3: Kaprodi Activity (Check Incidents & Transcripts)", () => {
    // 11. Login as Kaprodi
    cy.login("KAP001");
    cy.get("h2").contains("ACMS").should("be.visible");

    // 12. Check Incidents
    cy.visit("/dashboard/incidents");
    cy.contains("Daftar Laporan Insiden").should("be.visible");
    
    cy.get('button:contains("Detail")').first().click();
    // Validate it's anonymous
    cy.contains("Anonim").should("be.visible");
    cy.get('button:contains("Mulai Investigasi")').click();
    cy.contains("diperbarui").should("be.visible");

    // 13. Check Transcripts
    cy.visit("/dashboard/transcripts");
    cy.contains("Manajemen Transkrip").should("be.visible");
    // Verify Mini-CEX score is there
    cy.contains("Mini-CEX").should("exist");

    // 14. Logout
    cy.get('button:contains("Logout")').click();
  });
});
