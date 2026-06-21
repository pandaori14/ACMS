<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Transkrip Klinis</title>
    <style>
        body { font-family: sans-serif; font-size: 14px; line-height: 1.5; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .kop-title { font-size: 20px; font-weight: bold; margin: 0; }
        .kop-subtitle { font-size: 16px; margin: 5px 0; }
        .info-table { width: 100%; margin-bottom: 20px; }
        .info-table td { padding: 3px 0; }
        .grades-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .grades-table th, .grades-table td { border: 1px solid #000; padding: 8px; text-align: center; }
        .grades-table th { background-color: #f0f0f0; }
        .text-left { text-align: left !important; }
        .footer { width: 100%; margin-top: 50px; }
        .signature { float: right; width: 300px; text-align: center; }
    </style>
</head>
<body>

    <div class="header">
        <p class="kop-title">KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI</p>
        <p class="kop-subtitle">UNIVERSITAS ACMS</p>
        <p class="kop-subtitle">FAKULTAS KEDOKTERAN</p>
        <p style="font-size: 12px; margin:0;">Jl. Pendidikan No. 123, Kampus Terpadu, Telp. (021) 123456</p>
    </div>

    <h2 style="text-align: center; text-transform: uppercase;">Transkrip Prestasi Akademik Profesi Dokter</h2>

    <table class="info-table">
        <tr>
            <td width="20%">Nama Lengkap</td>
            <td width="2%">:</td>
            <td width="78%"><strong>{{ $student->name }}</strong></td>
        </tr>
        <tr>
            <td>NIM / No. Identitas</td>
            <td>:</td>
            <td>{{ substr($student->id, 0, 8) }}</td>
        </tr>
        <tr>
            <td>Program Studi</td>
            <td>:</td>
            <td>Profesi Dokter</td>
        </tr>
    </table>

    <table class="grades-table">
        <thead>
            <tr>
                <th width="5%">No</th>
                <th width="55%" class="text-left">Stase / Bagian Klinik</th>
                <th width="20%">Nilai Angka</th>
                <th width="20%">Huruf Mutu</th>
            </tr>
        </thead>
        <tbody>
            @foreach($grades as $index => $grade)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td class="text-left">{{ $grade->stase->name }}</td>
                <td>{{ $grade->final_score }}</td>
                <td>{{ $grade->letter_grade }}</td>
            </tr>
            @endforeach
            @if($grades->isEmpty())
            <tr>
                <td colspan="4">Belum ada stase yang diselesaikan.</td>
            </tr>
            @endif
        </tbody>
    </table>

    <div class="footer">
        <div class="signature">
            <p>Jakarta, {{ $date }}</p>
            <p>Dekan Fakultas Kedokteran,</p>
            <br><br><br><br>
            <p><strong>Prof. Dr. dr. Budi Santoso, Sp.PD.</strong></p>
            <p>NIP. 19700101 200003 1 001</p>
        </div>
    </div>

</body>
</html>
