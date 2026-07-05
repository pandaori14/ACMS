<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rekap Logbook — {{ $student->user->name ?? '-' }}</title>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; line-height: 1.45; color: #1f2937; }
        .kop { text-align: center; border-bottom: 3px double #1E3A8A; padding-bottom: 8px; margin-bottom: 14px; }
        .kop-title { font-size: 16px; font-weight: bold; color: #1E3A8A; margin: 0; }
        .kop-subtitle { font-size: 12px; margin: 2px 0; }
        h2.doc-title { text-align: center; text-transform: uppercase; font-size: 13px; letter-spacing: 1px; margin: 8px 0; }
        .info-table { width: 100%; margin-bottom: 12px; font-size: 11px; }
        .info-table td { padding: 2px 0; }
        table.data { width: 100%; border-collapse: collapse; }
        table.data th, table.data td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: left; vertical-align: top; }
        table.data th { background: #1E3A8A; color: #fff; font-size: 9px; }
        .status-verified { color: #047857; font-weight: bold; }
        .status-rejected { color: #b91c1c; font-weight: bold; }
        .status-other { color: #92400e; }
        .footer-note { font-size: 9px; color: #94a3b8; margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 6px; }
    </style>
</head>
<body>
    <div class="kop">
        <p class="kop-title">UNIVERSITAS MUHAMMADIYAH SURAKARTA</p>
        <p class="kop-subtitle">FAKULTAS KEDOKTERAN — PROGRAM PROFESI DOKTER</p>
    </div>

    <h2 class="doc-title">Rekapitulasi Buku Logbook Kepaniteraan Klinik</h2>

    <table class="info-table">
        <tr><td width="15%">Nama</td><td width="2%">:</td><td><strong>{{ $student->user->name ?? '-' }}</strong></td></tr>
        <tr><td>NIM</td><td>:</td><td>{{ $student->user->identity_number ?? '-' }}</td></tr>
        <tr><td>Total Entri</td><td>:</td><td>{{ $entries->count() }} ({{ $entries->where('status', 'verified')->count() }} terverifikasi)</td></tr>
    </table>

    <table class="data">
        <thead>
            <tr>
                <th width="4%">No</th>
                <th width="9%">Tanggal</th>
                <th width="13%">Stase / RS</th>
                <th width="8%">Tipe</th>
                <th>Deskripsi Kegiatan</th>
                <th width="13%">Diagnosis / Prosedur</th>
                <th width="10%">Status</th>
                <th width="12%">Verifikator</th>
            </tr>
        </thead>
        <tbody>
            @forelse($entries as $i => $entry)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ optional($entry->activity_date)->format('d/m/Y') }}</td>
                <td>
                    {{ $entry->rotationAssignment->stase->name ?? '-' }}<br>
                    <span style="color:#64748b;">{{ $entry->rotationAssignment->hospital->name ?? '' }}</span>
                </td>
                <td>{{ ['case' => 'Kasus', 'procedure' => 'Tindakan', 'duty' => 'Jaga'][$entry->activity_type] ?? $entry->activity_type }}</td>
                <td>{{ \Illuminate\Support\Str::limit($entry->description, 160) }}</td>
                <td>{{ $entry->diagnosis->name ?? $entry->procedure->name ?? '-' }}</td>
                <td class="{{ $entry->status === 'verified' ? 'status-verified' : ($entry->status === 'rejected' ? 'status-rejected' : 'status-other') }}">
                    {{ ['verified' => 'Terverifikasi', 'rejected' => 'Ditolak', 'submitted' => 'Menunggu', 'draft' => 'Draf'][$entry->status] ?? $entry->status }}
                </td>
                <td>{{ $entry->preceptor->name ?? '-' }}</td>
            </tr>
            @empty
            <tr><td colspan="8" style="text-align:center;">Belum ada entri logbook.</td></tr>
            @endforelse
        </tbody>
    </table>

    <p class="footer-note">
        Dicetak {{ $generatedAt->format('d F Y H:i') }} WIB oleh sistem ACMS FK UMS.
        Status verifikasi mengacu pada catatan preceptor di sistem.
    </p>
</body>
</html>
