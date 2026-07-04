<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $billing->invoice_number }}</title>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; line-height: 1.5; color: #333; }
        .header { border-bottom: 3px solid #1E3A8A; padding-bottom: 12px; margin-bottom: 24px; }
        .brand { font-size: 20px; font-weight: bold; color: #1E3A8A; }
        .brand-sub { font-size: 11px; color: #666; }
        .invoice-title { font-size: 24px; font-weight: bold; text-align: right; color: #1E3A8A; }
        .invoice-meta { text-align: right; font-size: 11px; color: #555; }
        .info-table { width: 100%; margin-bottom: 24px; }
        .info-table td { padding: 3px; vertical-align: top; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
        .data-table th { background-color: #1E3A8A; color: #fff; font-weight: bold; }
        .total-row td { font-weight: bold; font-size: 14px; background-color: #f1f5f9; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 11px; }
        .status-paid { background: #d1fae5; color: #065f46; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .footer { margin-top: 40px; font-size: 10px; color: #888; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    </style>
</head>
<body>

    <table style="width:100%; margin-bottom: 8px;">
        <tr>
            <td>
                <div class="brand">ACMS — Fakultas Kedokteran UMS</div>
                <div class="brand-sub">Academic Clinical Management System<br>Universitas Muhammadiyah Surakarta</div>
            </td>
            <td>
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-meta">
                    No: <strong>{{ $billing->invoice_number }}</strong><br>
                    Tanggal terbit: {{ \Carbon\Carbon::parse($billing->created_at)->format('d F Y') }}
                </div>
            </td>
        </tr>
    </table>
    <div class="header"></div>

    <table class="info-table">
        <tr>
            <td width="18%"><strong>Ditagihkan ke</strong></td>
            <td width="2%">:</td>
            <td width="80%">
                {{ $billing->hospital->name ?? '-' }}<br>
                {{ $billing->hospital->address ?? '' }}
            </td>
        </tr>
        <tr>
            <td><strong>Periode</strong></td>
            <td>:</td>
            <td>{{ $billing->period }}</td>
        </tr>
        <tr>
            <td><strong>Status</strong></td>
            <td>:</td>
            <td>
                @if ($billing->status === 'PAID')
                    <span class="status-badge status-paid">LUNAS</span>
                    @if ($billing->paid_at)
                        — dibayar {{ \Carbon\Carbon::parse($billing->paid_at)->format('d F Y') }}
                        @if ($billing->payment_method) via {{ $billing->payment_method }} @endif
                        @if ($billing->payment_reference) (ref: {{ $billing->payment_reference }}) @endif
                    @endif
                @else
                    <span class="status-badge status-pending">BELUM DIBAYAR</span>
                @endif
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th>Deskripsi</th>
                <th style="width: 30%; text-align: right;">Jumlah</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Biaya pendidikan klinis mahasiswa — periode {{ $billing->period }}{{ $billing->notes ? ' ('.$billing->notes.')' : '' }}</td>
                <td style="text-align: right;">Rp {{ number_format((float) $billing->amount, 0, ',', '.') }}</td>
            </tr>
            <tr class="total-row">
                <td style="text-align: right;">TOTAL</td>
                <td style="text-align: right;">Rp {{ number_format((float) $billing->amount, 0, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer">
        Dokumen ini diterbitkan secara elektronik oleh sistem ACMS FK UMS dan sah tanpa tanda tangan basah.
        Dicetak pada {{ now()->format('d F Y H:i') }}.
    </div>

</body>
</html>
