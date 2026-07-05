<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Transkrip Resmi — {{ $user->name }}</title>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; line-height: 1.5; color: #1f2937; }
        .kop { text-align: center; border-bottom: 3px double #1E3A8A; padding-bottom: 10px; margin-bottom: 18px; }
        .kop-title { font-size: 18px; font-weight: bold; color: #1E3A8A; margin: 0; }
        .kop-subtitle { font-size: 14px; margin: 2px 0; }
        .kop-address { font-size: 10px; color: #6b7280; margin: 0; }
        h2.doc-title { text-align: center; text-transform: uppercase; font-size: 15px; letter-spacing: 1px; margin: 14px 0; }
        .info-table { width: 100%; margin-bottom: 16px; }
        .info-table td { padding: 2px 0; vertical-align: top; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .data-table th, .data-table td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: center; }
        .data-table th { background-color: #1E3A8A; color: #fff; font-size: 11px; }
        .text-left { text-align: left !important; }
        .avg-row td { font-weight: bold; background: #f1f5f9; }
        .section-title { font-weight: bold; font-size: 13px; margin: 18px 0 8px; color: #1E3A8A; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
        .verify-box { margin-top: 26px; border: 1px solid #cbd5e1; padding: 10px; width: 100%; }
        .verify-box td { vertical-align: middle; padding: 4px 8px; }
        .verify-code { font-family: monospace; font-size: 10px; color: #475569; word-break: break-all; }
        .footer-note { font-size: 9px; color: #94a3b8; margin-top: 10px; }
        .page-break { page-break-after: always; }
        .cover-center { text-align: center; margin-top: 140px; }
        .cover-name { font-size: 22px; font-weight: bold; margin: 8px 0; }
    </style>
</head>
<body>

    {{-- ===== HALAMAN SAMPUL ===== --}}
    <div class="kop">
        <p class="kop-title">UNIVERSITAS MUHAMMADIYAH SURAKARTA</p>
        <p class="kop-subtitle">FAKULTAS KEDOKTERAN — PROGRAM PROFESI DOKTER</p>
        <p class="kop-address">Jl. A. Yani, Pabelan, Kartasura, Surakarta 57162</p>
    </div>

    <div class="cover-center">
        <p style="font-size:14px; letter-spacing:2px;">TRANSKRIP PRESTASI AKADEMIK</p>
        <p style="font-size:12px; color:#6b7280;">KEPANITERAAN KLINIK (YUDISIUM)</p>
        <br>
        <p class="cover-name">{{ $user->name }}</p>
        <p>NIM: <strong>{{ $user->identity_number ?? '-' }}</strong></p>
        <p>Program Studi: {{ $user->program->name ?? 'Profesi Dokter' }}</p>
        @if($average !== null)
            <br>
            <p style="font-size:13px;">Rata-rata Nilai Klinis: <strong>{{ $average }}</strong> ({{ $grades->count() }} stase)</p>
        @endif
        <br><br>
        <p style="font-size:10px; color:#6b7280;">Diterbitkan {{ $generatedAt->format('d F Y H:i') }} WIB</p>
    </div>

    <div class="page-break"></div>

    {{-- ===== HALAMAN NILAI STASE ===== --}}
    <div class="kop">
        <p class="kop-title">UNIVERSITAS MUHAMMADIYAH SURAKARTA</p>
        <p class="kop-subtitle">FAKULTAS KEDOKTERAN — PROGRAM PROFESI DOKTER</p>
    </div>

    <h2 class="doc-title">Daftar Nilai Stase Kepaniteraan Klinik</h2>

    <table class="info-table">
        <tr><td width="18%">Nama</td><td width="2%">:</td><td><strong>{{ $user->name }}</strong></td></tr>
        <tr><td>NIM</td><td>:</td><td>{{ $user->identity_number ?? '-' }}</td></tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th width="5%">No</th>
                <th class="text-left">Stase / Bagian</th>
                <th width="22%" class="text-left">Rumah Sakit</th>
                <th width="10%">Durasi</th>
                <th width="12%">Nilai</th>
                <th width="10%">Huruf</th>
            </tr>
        </thead>
        <tbody>
            @forelse($grades as $i => $grade)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td class="text-left">{{ $grade->rotationAssignment->stase->name ?? '-' }}</td>
                <td class="text-left">{{ $grade->rotationAssignment->hospital->name ?? '-' }}</td>
                <td>{{ $grade->rotationAssignment->stase->duration_weeks ?? '-' }} mgg</td>
                <td>{{ $grade->final_score }}</td>
                <td>{{ $grade->letter_grade }}</td>
            </tr>
            @empty
            <tr><td colspan="6">Belum ada nilai stase yang diterbitkan.</td></tr>
            @endforelse
            @if($grades->isNotEmpty() && $average !== null)
            <tr class="avg-row">
                <td colspan="4" class="text-left">Rata-rata</td>
                <td>{{ $average }}</td>
                <td></td>
            </tr>
            @endif
        </tbody>
    </table>

    {{-- ===== REKAP KETERAMPILAN KLINIS ===== --}}
    <p class="section-title">Rekapitulasi Keterampilan Klinis</p>
    <table class="data-table">
        <thead>
            <tr>
                <th class="text-left">Instrumen Penilaian</th>
                <th width="20%">Jumlah Sesi</th>
                <th width="20%">Rata-rata Nilai</th>
            </tr>
        </thead>
        <tbody>
            @forelse($skills as $skill)
            <tr>
                <td class="text-left">{{ $skill['type'] }}</td>
                <td>{{ $skill['count'] }}</td>
                <td>{{ $skill['average'] }}</td>
            </tr>
            @empty
            <tr><td colspan="3">Belum ada penilaian keterampilan yang disahkan.</td></tr>
            @endforelse
        </tbody>
    </table>

    @if($logbookCounts->isNotEmpty())
    <p class="section-title">Aktivitas Logbook Terverifikasi</p>
    <table class="data-table">
        <thead>
            <tr>
                <th class="text-left">Stase</th>
                <th width="25%">Entri Terverifikasi</th>
            </tr>
        </thead>
        <tbody>
            @foreach($logbookCounts as $staseName => $count)
            <tr>
                <td class="text-left">{{ $staseName }}</td>
                <td>{{ $count }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- ===== BLOK VERIFIKASI QR ===== --}}
    <table class="verify-box">
        <tr>
            <td width="120" style="text-align:center;">
                <img src="{{ $qrDataUri }}" width="105" height="105" alt="QR Verifikasi">
            </td>
            <td>
                <strong>Verifikasi Keaslian Dokumen</strong><br>
                Pindai QR atau kunjungi:<br>
                <span class="verify-code">{{ $verifyUrl }}</span><br>
                Kode: <span class="verify-code">{{ $verificationCode }}</span>
            </td>
        </tr>
    </table>

    <p class="footer-note">
        Dokumen ini diterbitkan secara elektronik oleh sistem ACMS FK UMS pada
        {{ $generatedAt->format('d F Y H:i') }} WIB dan sah tanpa tanda tangan basah.
        Keaslian dapat diverifikasi kapan pun melalui tautan di atas.
    </p>

</body>
</html>
