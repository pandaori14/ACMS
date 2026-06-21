# ACMS — UI/UX Design System

**Document ID**: ACMS-UI-001  
**Version**: 1.0.0  
**Context**: This document defines the visual language, Tailwind CSS conventions, and component guidelines for the ACMS Next.js frontend. AI Agents MUST adhere strictly to these rules to maintain a consistent User Experience (UX).

---

## 1. Color Palette

ACMS uses a professional, medical-academic color scheme aligned with Universitas Muhammadiyah Surakarta branding.

**Primary Colors (UMS Blue):**
- Base (`primary`): `bg-blue-900` (#1E3A8A) - Used for primary buttons, active sidebar links, headers.
- Hover (`primary-hover`): `bg-blue-800` (#1E40AF)
- Light/Subtle (`primary-light`): `bg-blue-50` (#EFF6FF) - Used for selected row backgrounds.

**Secondary Colors (UMS Gold/Yellow):**
- Base (`secondary`): `bg-yellow-500` (#EAB308) - Used for accents, primary action highlights.

**Semantic Colors:**
- Success: `bg-green-600` (Approved, Passed, Completed)
- Danger/Destructive: `bg-red-600` (Rejected, Failed, Delete Actions)
- Warning: `bg-amber-500` (Pending, Under Review)
- Info: `bg-sky-500` (Information, Draft)

**Neutrals (Backgrounds & Text):**
- App Background: `bg-slate-50` (Light mode default)
- Card Background: `bg-white`
- Primary Text: `text-slate-900`
- Secondary/Muted Text: `text-slate-500`
- Borders: `border-slate-200`

---

## 2. Typography

We use modern, highly legible sans-serif fonts (e.g., `Inter` or `Geist`).

- **Page Titles (H1)**: `text-2xl font-bold tracking-tight text-slate-900`
- **Section Headers (H2)**: `text-xl font-semibold text-slate-800`
- **Card Titles (H3)**: `text-lg font-semibold text-slate-900`
- **Body Text**: `text-sm text-slate-700`
- **Small/Meta Text**: `text-xs text-slate-500`

---

## 3. Spacing & Layout (Grid System)

Consistency in spacing separates amateur UIs from enterprise UIs.

### 3.1 Containers & Pages
- **Page Padding**: `p-6 md:p-8`
- **Max Width**: Dashboards should be fluid (`w-full`), but forms/settings should often be constrained (`max-w-4xl mx-auto`).
- **Gaps**: Always use `gap-4` or `gap-6` for grid layouts.

### 3.2 Cards
Every distinct piece of information should live in a card.
- **Card Classes**: `bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden`
- **Card Padding**: `p-5` or `p-6`

---

## 4. Components (`shadcn/ui` Guidelines)

Do not build custom complex UI components from scratch if a `shadcn/ui` equivalent exists.

### 4.1 Buttons
- **Primary**: `<Button variant="default">` (Uses UMS Blue)
- **Secondary**: `<Button variant="outline">`
- **Destructive**: `<Button variant="destructive">` (Deletions, Rejections)
- **Ghost**: `<Button variant="ghost">` (Icon buttons, subtle actions)

### 4.2 Forms
- Forms MUST use `react-hook-form` integrated with `zod` for validation.
- Fields must be wrapped in `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` from shadcn.
- Always show clear, red validation error messages below the input.

### 4.3 Data Tables
- Use `@tanstack/react-table` (via shadcn `DataTable`).
- Always include pagination for datasets > 10 rows.
- Search/Filter inputs should be placed above the table on the right side.

---

## 5. Interaction & Feedback (UX)

- **Loading States**: Never show a blank screen. Use Skeleton loaders (`<Skeleton className="h-4 w-[250px]" />`) for data fetching, and spinner icons inside buttons during mutations (`isPending` state from TanStack Query).
- **Empty States**: If a table or list is empty, show a friendly illustration or icon with a clear message (e.g., "No rotation periods found. Create one to get started.").
- **Toasts**: Success or error messages from API mutations MUST trigger a toast notification (e.g., "Logbook submitted successfully").

---

## 6. Accessibility (A11y) & Senior-Friendly UX

Karena sebagian pengguna utama (Dodiknis / Dokter Pendidik dan Kaprodi) mungkin adalah dokter atau profesor senior, UI harus dirancang dengan prinsip **Inclusive & Senior-Friendly Design**:

### 6.1 Keterbacaan (Readability) & Kontras
- **Ukuran Font Minimum**: Teks bacaan (*body text*) tidak boleh lebih kecil dari `14px` (`text-sm`), direkomendasikan `16px` (`text-base`) untuk keterbacaan optimal.
- **Rasio Kontras Tinggi (WCAG AA/AAA)**: Teks abu-abu muda di atas latar putih DILARANG keras. Teks sekunder minimal harus menggunakan `text-slate-500` di atas latar putih.
- **Label Ikon Eksplisit**: Jangan pernah menggunakan ikon yang berdiri sendiri tanpa teks pendamping untuk aksi penting. (Salah: 💾 | Benar: 💾 Simpan).

### 6.2 Kemudahan Interaksi (Click Targets)
- **Area Sentuh Besar**: Semua tombol dan *link* di tampilan *mobile* harus memiliki area sentuh (*hitbox*) minimal `44x44px`. Gunakan padding yang luas (minimal `py-2 px-4` untuk tombol).
- **Pemilihan Opsi yang Mudah**: Gunakan kartu pilihan (*Radio Cards* atau *Segmented Controls*) berukuran besar alih-alih *dropdown* kecil (*select*) yang sulit diklik di layar sentuh.

### 6.3 Beban Kognitif & Tata Letak
- **Minimalisir Kekacauan (Declutter)**: Jangan menjejalkan terlalu banyak informasi dalam satu layar. Gunakan prinsip *Progressive Disclosure* (tampilkan opsi lanjutan hanya jika dibutuhkan).
- **Navigasi Linier**: Untuk proses pengisian form panjang (seperti Logbook atau Penilaian DOPS), pisahkan menjadi langkah-langkah (*Step-by-step Wizard*) agar tidak mengintimidasi pengguna.
- **Mencegah Kesalahan Bermakna (Error Prevention)**: Tombol aksi destruktif (Hapus, Tolak) harus selalu memunculkan kotak dialog konfirmasi ("Apakah Anda yakin?") dengan teks penjelasan konsekuensinya.

---

## 7. Design Inspiration & Benchmarks (The "North Star")

To ensure all AI Agents and Human Developers understand the exact aesthetic and interaction quality expected, ACMS explicitly uses the following world-class applications as visual benchmarks:

1. **Shadcn/UI Dashboard** (https://ui.shadcn.com/examples/dashboard)
   - *Benchmark for*: Component anatomy, spacing, border radiuses, and form layouts.
2. **Vercel** (https://vercel.com)
   - *Benchmark for*: Cleanliness, ultra-thin borders, high contrast text, and subtle shadows.
3. **Linear** (https://linear.app)
   - *Benchmark for*: Instant interactivity, zero-layout-shift transitions, dark mode elegance, and premium feel.
4. **Supabase** (https://supabase.com)
   - *Benchmark for*: Handling complex data tables and dense settings pages without overwhelming the user.

**Rule of Thumb**: If a UI decision is ambiguous during development, ask yourself (or the AI): *"How would Vercel or Linear design this?"* and default to that high standard.
