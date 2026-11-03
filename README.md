# Sistem Pemberian Perintah Kerja (ISPK/SPK)

Aplikasi web untuk tugas **Teknik Supervisi**. Aplikasi ini mendigitalkan pemberian perintah kerja dari Supervisor (SPV) ke staff, mengikuti alur di ASTRAtech:

1. **SPV menerbitkan** perintah kerja:
   - **ISPK**: proyek internal.
   - **SPK**: proyek berbasis PO, dilengkapi nomor PO, tanggal PO, klien, nilai PO, dan lampiran dokumen PO.
2. **Manager divisi meninjau.**
   - Jika **disahkan**, nomor resmi terbit, misalnya `SPK/001/PMS/X/2026`.
   - Jika **ditolak**, alasan wajib diisi dan SPV merevisi lalu mengajukan ulang.
3. **SPV menurunkan** perintah yang sudah sah ke satu atau beberapa staff.
4. **Staff merespons.** Staff boleh bertanya dulu, lalu **menerima** atau **menolak**.
   - Jika jumlah tugas aktifnya sudah mencapai **batas KPI**, sistem menampilkan **alert** terlebih dahulu.
   - Staff boleh menolak dengan alasan beban kerja.
5. **Staff mengerjakan dan melapor:**
   - **Action Plan (AP)** sebagai rencana kegiatan.
   - **Laporan harian** per AP.
   - **Laporan mingguan.** Jika ada kendala kinerja, **PICA** (Problem, Identification, Corrective Action, PIC, due date) wajib diisi.
6. **Laporan akhir** dikirim setelah semua AP selesai.
   - SPV mengevaluasi tiga aspek dengan skor 1–5, lalu menyetujui atau meminta revisi.
   - Poin otomatis = rata-rata skor × 10, ditambah 10 jika tepat waktu.
7. **Reward dan teguran.** Sistem menyarankan teguran jika dalam 30 hari terakhir staff:
   - terlambat ≥ 2 kali,
   - nilai rata-rata < 3, atau
   - tidak mengirim laporan harian ≥ 3 hari kerja.

   Keputusan memberi teguran tetap di tangan SPV.

## Peran

| Peran | Wewenang |
|---|---|
| Admin | Kelola divisi, akun, dan batas tugas aktif (KPI) tiap staff |
| Manager | Sahkan atau tolak ISPK/SPK divisinya; pantau rekap KPI dan PICA |
| Supervisor (SPV) | Terbitkan dan revisi ISPK/SPK, turunkan ke staff, jawab pertanyaan, tanggapi laporan, evaluasi, beri reward dan teguran |
| Staff | Terima atau tolak perintah, isi AP, laporan harian, laporan mingguan + PICA, dan laporan akhir |

## Teknologi

- **Next.js 15** (App Router, Server Actions, TypeScript)
- **MySQL 8** bawaan **Laragon**, diakses lewat **Prisma ORM** (`prisma/schema.prisma`)
- Login dengan **bcrypt** dan cookie sesi bertanda tangan (`jose`); middleware membatasi area tiap peran
- Lampiran PDF/JPG/PNG maksimal 2 MB, disimpan di `storage/uploads/` dan hanya bisa dibuka pengguna yang sudah login

Versi prototipe lama (HTML + localStorage) diarsipkan di folder `legacy/`.

## Menjalankan dengan Laragon

1. Buka Laragon, lalu klik **Start All** agar MySQL berjalan di port 3306.
2. Salin konfigurasi:

   ```bash
   cp .env.example .env
   ```

   Isi `SESSION_SECRET` dengan string acak minimal 32 karakter. `DATABASE_URL` bawaan sudah sesuai Laragon: user `root` tanpa password, database `perintah_kerja`.
3. Pasang dependensi, buat database, dan isi data demo:

   ```bash
   npm install
   npx prisma migrate dev
   npx prisma db seed
   ```
4. Jalankan:

   ```bash
   npm run dev
   ```

   Lalu buka http://localhost:3000.

Untuk mengembalikan data demo ke kondisi awal, jalankan `npm run db:reset`.

## Akun demo

Semua akun memakai password `demo123`.

| Username | Peran | Catatan |
|---|---|---|
| admin | Admin | — |
| hendra / lestari | Manager Pemasaran / Keuangan | hendra punya 1 ISPK yang menunggu pengesahan |
| budi / siti | SPV Pemasaran / Keuangan | budi punya SPK ditolak, perintah sah yang belum diturunkan, PICA open, dan laporan akhir yang menunggu evaluasi |
| andi | Staff | Sedang mengerjakan SPK dengan PICA open; punya 1 pertanyaan yang belum dijawab |
| dewi | Staff | KPI penuh (2/2), sehingga alert muncul saat membuka perintah baru |
| rina | Staff | Sering terlambat dan laporan harian bolong, sehingga muncul saran teguran SP1 |
| joko, maya, fajar | Staff Keuangan | — |

## Struktur

```
app/(app)/{admin,manager,spv,staff}/   halaman per peran
app/actions/                           Server Actions (memanggil lib/logic)
lib/logic/                             aturan bisnis: perintah, penugasan, laporan, evaluasi, rekap
components/                            lembar surat, laporan (AP/harian/mingguan/PICA/akhir), tabel
prisma/schema.prisma, prisma/seed.ts   skema MySQL dan data demo
```
