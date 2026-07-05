<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Statistik Insiden</title>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; line-height: 1.5; color: #1f2937; }
        .kop { text-align: center; border-bottom: 3px double #1E3A8A; padding-bottom: 8px; margin-bottom: 16px; }
        .kop-title { font-size: 16px; font-weight: bold; color: #1E3A8A; margin: 0; }
        .kop-subtitle { font-size: 12px; margin: 2px 0; }
        h2.doc-title { text-align: center; text-transform: uppercase; font-size: 13px; letter-spacing: 1px; margin: 10px 0; }
        .total-box { text-align: center; margin: 14px 0; }
        .total-num { font-size: 30px; font-weight: bold; color: #1E3A8A; }
        .section-title { font-weight: bold; font-size: 12px; margin: 14px 0 6px; color: #1E3A8A; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; }
        th { background: #1E3A8A; color: #fff; }
        .footer-note { font-size: 9px; color: #94a3b8; margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 6px; }
    </style>
</head>
<body>
    <div class="kop">
        <p class="kop-title">UNIVERSITAS MUHAMMADIYAH SURAKARTA</p>
        <p class="kop-subtitle">FAKULTAS KEDOKTERAN — PROGRAM PROFESI DOKTER</p>
    </div>

    <h2 class="doc-title">Laporan Statistik Insiden Klinis</h2>
    <p style="text-align:center; color:#64748b; font-size:10px;">Dicetak {{ $generatedAt->format('d F Y H:i') }} WIB</p>

    <div class="total-box">
        <div class="total-num">{{ $stats['total'] }}</div>
        <div>Total laporan insiden tercatat</div>
    </div>

    <p class="section-title">Berdasarkan Status</p>
    <table>
        <thead><tr><th>Status</th><th width="20%">Jumlah</th></tr></thead>
        <tbody>
            @forelse($stats['by_status'] as $status => $count)
                <tr><td>{{ ucfirst($status) }}</td><td>{{ $count }}</td></tr>
            @empty
                <tr><td colspan="2">Belum ada data.</td></tr>
            @endforelse
        </tbody>
    </table>

    <p class="section-title">Berdasarkan Jenis Insiden</p>
    <table>
        <thead><tr><th>Jenis</th><th width="20%">Jumlah</th></tr></thead>
        <tbody>
            @forelse($stats['by_type'] as $type => $count)
                <tr><td>{{ str_replace('_', ' ', ucfirst($type)) }}</td><td>{{ $count }}</td></tr>
            @empty
                <tr><td colspan="2">Belum ada data.</td></tr>
            @endforelse
        </tbody>
    </table>

    <p class="section-title">Berdasarkan Tingkat Keparahan</p>
    <table>
        <thead><tr><th>Keparahan</th><th width="20%">Jumlah</th></tr></thead>
        <tbody>
            @forelse($stats['by_severity'] as $severity => $count)
                <tr><td>{{ ucfirst($severity) }}</td><td>{{ $count }}</td></tr>
            @empty
                <tr><td colspan="2">Belum ada data.</td></tr>
            @endforelse
        </tbody>
    </table>

    <p class="section-title">Tren 30 Hari Terakhir</p>
    <table>
        <thead><tr><th>Tanggal</th><th width="20%">Laporan</th></tr></thead>
        <tbody>
            @forelse($stats['trend_30_days'] as $row)
                <tr><td>{{ $row['date'] }}</td><td>{{ $row['count'] }}</td></tr>
            @empty
                <tr><td colspan="2">Tidak ada laporan 30 hari terakhir.</td></tr>
            @endforelse
        </tbody>
    </table>

    <p class="footer-note">
        Dokumen dihasilkan otomatis oleh sistem ACMS FK UMS untuk keperluan pemantauan
        keselamatan pendidikan klinik. Identitas pelapor tidak disertakan.
    </p>
</body>
</html>
