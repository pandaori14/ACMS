<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Berita Acara Ujian</title>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; line-height: 1.5; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .title { font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
        .subtitle { font-size: 14px; }
        .info-table { width: 100%; margin-bottom: 20px; }
        .info-table td { padding: 3px; vertical-align: top; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .data-table th, .data-table td { border: 1px solid #000; padding: 8px; text-align: left; }
        .data-table th { background-color: #f2f2f2; font-weight: bold; }
        .text-center { text-align: center; }
        .signature-section { width: 100%; margin-top: 50px; }
        .signature-box { width: 45%; display: inline-block; text-align: center; }
        .signature-space { height: 80px; }
        .page-break { page-break-after: always; }
    </style>
</head>
<body>

    <div class="header">
        <div class="title">LEMBAGA PENDIDIKAN KLINIS</div>
        <div class="subtitle">BERITA ACARA PELAKSANAAN UJIAN {{ strtoupper($exam->type) }}</div>
    </div>

    <table class="info-table">
        <tr>
            <td width="20%"><strong>Nama Ujian</strong></td>
            <td width="2%">:</td>
            <td width="78%">{{ $exam->name }}</td>
        </tr>
        <tr>
            <td><strong>Tipe Ujian</strong></td>
            <td>:</td>
            <td>{{ $exam->type }}</td>
        </tr>
        <tr>
            <td><strong>Tanggal Ujian</strong></td>
            <td>:</td>
            <td>{{ \Carbon\Carbon::parse($exam->start_time)->format('d F Y') }}</td>
        </tr>
        <tr>
            <td><strong>Waktu Pelaksanaan</strong></td>
            <td>:</td>
            <td>{{ \Carbon\Carbon::parse($exam->start_time)->format('H:i') }} - {{ \Carbon\Carbon::parse($exam->end_time)->format('H:i') }}</td>
        </tr>
        <tr>
            <td><strong>Status</strong></td>
            <td>:</td>
            <td>{{ $exam->status }}</td>
        </tr>
    </table>

    <div style="font-weight: bold; margin-bottom: 10px;">Daftar Peserta dan Nilai Akhir:</div>
    <table class="data-table">
        <thead>
            <tr>
                <th width="5%" class="text-center">No</th>
                <th width="20%">NIM</th>
                <th width="45%">Nama Peserta</th>
                <th width="30%" class="text-center">Nilai Rata-Rata</th>
            </tr>
        </thead>
        <tbody>
            @foreach($exam->participants as $index => $participant)
                @php
                    $totalScore = 0;
                    $stationCount = $exam->stations->count();
                    $participantScores = $participant->scores;
                    if($participantScores->count() > 0) {
                        $totalScore = $participantScores->sum('final_score') / $stationCount;
                    }
                @endphp
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>{{ $participant->student->user->identity_number ?? '-' }}</td>
                    <td>{{ $participant->student->user->name ?? '-' }}</td>
                    <td class="text-center">{{ number_format($totalScore, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="signature-section">
        <div class="signature-box" style="float: left;">
            <div>Mengetahui,</div>
            <div>Kaprodi / Kordik</div>
            <div class="signature-space"></div>
            <div>(_________________________)</div>
            <div>NIP.</div>
        </div>
        
        <div class="signature-box" style="float: right;">
            <div>Ditetapkan pada tanggal {{ date('d F Y') }}</div>
            <div>Ketua Penguji</div>
            <div class="signature-space"></div>
            <div>(_________________________)</div>
            <div>NIP.</div>
        </div>
        <div style="clear: both;"></div>
    </div>

</body>
</html>
