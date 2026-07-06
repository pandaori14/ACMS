<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Surat Keterangan — {{ $user->name }}</title>
    <style>
        body { font-family: 'Times New Roman', 'Georgia', serif; font-size: 12.5px; line-height: 1.7; color: #111827; margin: 30px 45px; }
        .kop { text-align: center; border-bottom: 3px double #1E3A8A; padding-bottom: 10px; margin-bottom: 20px; }
        .kop-title { font-size: 18px; font-weight: bold; color: #1E3A8A; margin: 0; }
        .kop-subtitle { font-size: 14px; margin: 2px 0; }
        .kop-address { font-size: 10px; color: #6b7280; margin: 0; }
        .doc-title { text-align: center; margin: 22px 0 4px; }
        .doc-title h2 { font-size: 15px; text-decoration: underline; letter-spacing: 1px; margin: 0; text-transform: uppercase; }
        .doc-number { text-align: center; font-size: 12px; margin: 2px 0 24px; }
        .info-table { margin: 12px 0 12px 24px; }
        .info-table td { padding: 2px 6px 2px 0; vertical-align: top; }
        .verify-box { margin-top: 30px; border: 1px solid #cbd5e1; padding: 8px; width: 100%; font-family: 'Helvetica', sans-serif; font-size: 10px; }
        .verify-box td { vertical-align: middle; padding: 4px 8px; }
        .verify-code { font-family: monospace; font-size: 9px; color: #475569; word-break: break-all; }
        .footer-note { font-size: 9px; color: #94a3b8; margin-top: 10px; font-family: 'Helvetica', sans-serif; }
        .signature { margin-top: 34px; width: 100%; }
        .signature td { vertical-align: top; }
    </style>
</head>
<body>

    <div class="kop">
        <p class="kop-title">UNIVERSITAS MUHAMMADIYAH SURAKARTA</p>
        <p class="kop-subtitle">FAKULTAS KEDOKTERAN — PROGRAM PROFESI DOKTER</p>
        <p class="kop-address">Jl. A. Yani, Pabelan, Kartasura, Surakarta 57162</p>
    </div>

    <div class="doc-title">
        <h2>Surat Keterangan {{ $letterType === 'graduated' ? 'Lulus' : 'Mahasiswa Aktif' }}</h2>
    </div>
    <p class="doc-number">Nomor: {{ $letterNumber }}</p>

    <p>Sistem Akademik Pendidikan Klinik (ACMS) Fakultas Kedokteran Universitas
       Muhammadiyah Surakarta menerangkan bahwa:</p>

    <table class="info-table">
        <tr><td width="140">Nama</td><td width="10">:</td><td><strong>{{ $user->name }}</strong></td></tr>
        <tr><td>NIM</td><td>:</td><td>{{ $user->identity_number ?? '-' }}</td></tr>
        <tr><td>Program Studi</td><td>:</td><td>{{ $user->program->name ?? 'Profesi Dokter' }}</td></tr>
        <tr><td>Angkatan</td><td>:</td><td>{{ $user->student?->cohort?->name ?? '-' }}</td></tr>
    </table>

    @if($letterType === 'graduated')
        <p>adalah benar telah <strong>menyelesaikan seluruh rangkaian Kepaniteraan Klinik</strong>
           dan dinyatakan <strong>LULUS</strong> pada Program Profesi Dokter Fakultas Kedokteran
           Universitas Muhammadiyah Surakarta
           @if($average !== null)
               dengan rata-rata nilai klinis <strong>{{ $average }}</strong>
           @endif
           .</p>
    @else
        <p>adalah benar <strong>mahasiswa aktif</strong> pada Program Profesi Dokter (Kepaniteraan
           Klinik) Fakultas Kedokteran Universitas Muhammadiyah Surakarta pada saat surat ini
           diterbitkan.</p>
    @endif

    <p>Surat keterangan ini diterbitkan untuk dipergunakan sebagaimana mestinya.</p>

    <table class="signature">
        <tr>
            <td width="55%"></td>
            <td>
                Surakarta, {{ $generatedAt->translatedFormat('d F Y') }}<br>
                Sistem ACMS FK UMS<br><br>
                <em style="font-size:10px; color:#6b7280;">Dokumen elektronik — keaslian
                diverifikasi melalui QR di bawah.</em>
            </td>
        </tr>
    </table>

    <table class="verify-box">
        <tr>
            <td width="105"><img src="{{ $qrDataUri }}" width="95" height="95" alt="QR"></td>
            <td>
                <strong>Verifikasi Keaslian Dokumen</strong><br>
                Pindai QR atau kunjungi:<br>
                <span class="verify-code">{{ $verifyUrl }}</span><br>
                Kode: <span class="verify-code">{{ $verificationCode }}</span>
            </td>
        </tr>
    </table>

    <p class="footer-note">
        Diterbitkan secara elektronik oleh sistem ACMS FK UMS pada
        {{ $generatedAt->format('d F Y H:i') }} WIB — sah tanpa tanda tangan basah.
    </p>

</body>
</html>
