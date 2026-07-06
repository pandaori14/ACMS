<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Buku Logbook — {{ $user->name }}</title>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; line-height: 1.5; color: #1f2937; }
        .kop { text-align: center; border-bottom: 3px double #1E3A8A; padding-bottom: 10px; margin-bottom: 18px; }
        .kop-title { font-size: 18px; font-weight: bold; color: #1E3A8A; margin: 0; }
        .kop-subtitle { font-size: 14px; margin: 2px 0; }
        .kop-address { font-size: 10px; color: #6b7280; margin: 0; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .data-table th, .data-table td { border: 1px solid #94a3b8; padding: 5px 7px; text-align: left; vertical-align: top; }
        .data-table th { background-color: #1E3A8A; color: #fff; font-size: 10px; }
        .section-title { font-weight: bold; font-size: 13px; margin: 18px 0 8px; color: #1E3A8A; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
        .verify-box { margin-top: 26px; border: 1px solid #cbd5e1; padding: 10px; width: 100%; }
        .verify-box td { vertical-align: middle; padding: 4px 8px; }
        .verify-code { font-family: monospace; font-size: 10px; color: #475569; word-break: break-all; }
        .footer-note { font-size: 9px; color: #94a3b8; margin-top: 10px; }
        .page-break { page-break-after: always; }
        .cover-center { text-align: center; margin-top: 140px; }
        .cover-name { font-size: 22px; font-weight: bold; margin: 8px 0; }
        .muted { color: #6b7280; }
    </style>
</head>
<body>

    {{-- ===== SAMPUL ===== --}}
    <div class="kop">
        <p class="kop-title">UNIVERSITAS MUHAMMADIYAH SURAKARTA</p>
        <p class="kop-subtitle">FAKULTAS KEDOKTERAN — PROGRAM PROFESI DOKTER</p>
        <p class="kop-address">Jl. A. Yani, Pabelan, Kartasura, Surakarta 57162</p>
    </div>

    <div class="cover-center">
        <p style="font-size:14px; letter-spacing:2px;">BUKU LOGBOOK KEGIATAN KLINIS</p>
        <p style="font-size:12px; color:#6b7280;">KEPANITERAAN KLINIK</p>
        <br>
        <p class="cover-name">{{ $user->name }}</p>
        <p>NIM: <strong>{{ $user->identity_number ?? '-' }}</strong></p>
        <p>Program Studi: {{ $user->program->name ?? 'Profesi Dokter' }}</p>
        <br>
        <p style="font-size:13px;">{{ $totalEntries }} kegiatan terverifikasi pada {{ $byStase->count() }} stase</p>
        <br><br>
        <p style="font-size:10px; color:#6b7280;">Diterbitkan {{ $generatedAt->format('d F Y H:i') }} WIB</p>
    </div>

    <div class="page-break"></div>

    {{-- ===== ISI PER STASE ===== --}}
    <div class="kop">
        <p class="kop-title">UNIVERSITAS MUHAMMADIYAH SURAKARTA</p>
        <p class="kop-subtitle">FAKULTAS KEDOKTERAN — BUKU LOGBOOK: {{ $user->name }} ({{ $user->identity_number ?? '-' }})</p>
    </div>

    @forelse($byStase as $staseName => $entries)
        <p class="section-title">{{ $staseName }} — {{ $entries->count() }} kegiatan ({{ $entries->first()?->rotationAssignment?->hospital?->name ?? '-' }})</p>
        <table class="data-table">
            <thead>
                <tr>
                    <th width="4%">No</th>
                    <th width="11%">Tanggal</th>
                    <th width="13%">Jenis</th>
                    <th>Deskripsi Kegiatan</th>
                    <th width="17%">Kompetensi</th>
                    <th width="14%">Verifikator</th>
                </tr>
            </thead>
            <tbody>
                @foreach($entries as $i => $entry)
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td>{{ \Illuminate\Support\Carbon::parse($entry->activity_date)->format('d/m/Y') }}</td>
                        <td>{{ $entry->activity_type ?? '-' }}</td>
                        <td>
                            {{ \Illuminate\Support\Str::limit($entry->description ?? '-', 220) }}
                            @if($entry->preceptor_feedback)
                                <br><span class="muted">Catatan: {{ \Illuminate\Support\Str::limit($entry->preceptor_feedback, 120) }}</span>
                            @endif
                        </td>
                        <td>{{ $entry->competency?->name ?? '-' }}</td>
                        <td>{{ $entry->preceptor?->name ?? '-' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @empty
        <p class="muted">Belum ada logbook terverifikasi.</p>
    @endforelse

    {{-- ===== VERIFIKASI ===== --}}
    <table class="verify-box">
        <tr>
            <td width="120"><img src="{{ $qrDataUri }}" width="110" height="110" alt="QR"></td>
            <td>
                <strong>Verifikasi Keaslian Dokumen</strong><br>
                Pindai QR atau kunjungi:<br>
                <span class="verify-code">{{ $verifyUrl }}</span><br><br>
                Kode: <span class="verify-code">{{ $verificationCode }}</span>
            </td>
        </tr>
    </table>

    <p class="footer-note">
        Dokumen ini diterbitkan secara elektronik oleh sistem ACMS FK UMS pada
        {{ $generatedAt->format('d F Y H:i') }} WIB dan sah tanpa tanda tangan basah.
    </p>

</body>
</html>
