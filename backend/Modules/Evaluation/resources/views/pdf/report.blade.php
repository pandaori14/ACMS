<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Laporan Evaluasi Klinis</title>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; line-height: 1.5; color: #1f2937; }
        .kop { text-align: center; border-bottom: 3px double #1E3A8A; padding-bottom: 8px; margin-bottom: 16px; }
        .kop-title { font-size: 16px; font-weight: bold; color: #1E3A8A; margin: 0; }
        .kop-subtitle { font-size: 12px; margin: 2px 0; }
        h2.doc-title { text-align: center; text-transform: uppercase; font-size: 13px; letter-spacing: 1px; margin: 10px 0; }
        .target { border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid; }
        .target-header { font-weight: bold; font-size: 12px; margin-bottom: 4px; }
        .meta { color: #64748b; font-size: 10px; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin: 4px 0; }
        th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; }
        th { background: #f1f5f9; }
        .comments { margin-top: 6px; }
        .comment { background: #f8fafc; border-left: 3px solid #cbd5e1; padding: 3px 6px; margin: 3px 0; font-style: italic; }
        .footer-note { font-size: 9px; color: #94a3b8; margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 6px; }
    </style>
</head>
<body>
    <div class="kop">
        <p class="kop-title">UNIVERSITAS MUHAMMADIYAH SURAKARTA</p>
        <p class="kop-subtitle">FAKULTAS KEDOKTERAN — PROGRAM PROFESI DOKTER</p>
    </div>

    <h2 class="doc-title">Laporan Evaluasi Klinis (Agregat Anonim)</h2>
    <p class="meta" style="text-align:center;">
        Ambang anonimitas: minimal {{ $minResponses }} responden per target ·
        Dicetak {{ $generatedAt->format('d F Y H:i') }} WIB
    </p>

    @forelse($report as $target)
        <div class="target">
            <div class="target-header">
                {{ $target['target_name'] }}
                ({{ $target['target_type'] === 'HOSPITAL' ? 'Rumah Sakit' : 'Preceptor' }})
            </div>
            <div class="meta">
                {{ $target['respondents'] }} responden — rata-rata
                <strong>{{ number_format($target['average_rating'], 2) }}</strong> / 5.00
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Pertanyaan</th>
                        <th width="15%">Rata-rata</th>
                        <th width="15%">Jawaban</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($target['per_question'] as $q)
                    <tr>
                        <td>{{ $q['question'] ?? '-' }}</td>
                        <td>{{ number_format($q['average'], 2) }}</td>
                        <td>{{ $q['count'] }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @if(count($target['comments']) > 0)
                <div class="comments">
                    <strong>Komentar anonim:</strong>
                    @foreach($target['comments'] as $comment)
                        <div class="comment">&ldquo;{{ $comment }}&rdquo;</div>
                    @endforeach
                </div>
            @endif
        </div>
    @empty
        <p style="text-align:center; color:#64748b;">Belum ada data evaluasi yang memenuhi ambang anonimitas.</p>
    @endforelse

    <p class="footer-note">
        Dokumen dihasilkan otomatis oleh sistem ACMS FK UMS. Identitas responden dianonimkan
        secara permanen; target dengan responden di bawah ambang tidak ditampilkan.
    </p>
</body>
</html>
