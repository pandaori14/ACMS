<?php

namespace Modules\Academic\Imports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

/**
 * Membaca baris spreadsheet import mahasiswa apa adanya (heading: nama, email, nim, password).
 * Validasi & pembuatan akun dilakukan StudentService::importRows agar bisa
 * mengembalikan ringkasan per-baris (bukan gagal total).
 */
class StudentRowsImport implements ToCollection, WithHeadingRow
{
    /** @var Collection<int, array<string, mixed>> */
    public Collection $rows;

    public function __construct()
    {
        $this->rows = collect();
    }

    public function collection(Collection $collection): void
    {
        $this->rows = $collection->map(fn ($row) => $row->toArray());
    }
}
