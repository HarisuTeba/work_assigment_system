# Sistem SPK Eksternal — Direktorat 3 Industrial Service

Aplikasi web untuk tugas **Teknik Supervisi**. Aplikasi ini mendigitalkan alur order lini **Training, Konsultasi & Sertifikasi** Politeknik Astra (Astratek), mulai dari permintaan customer sampai serah terima pekerjaan. Dengan begitu, order tidak lagi tercecer di Excel atau WhatsApp, dan setiap tahap punya batas waktu (SLA) yang terpantau.

## Alur bisnis

1. **RFQ.** Marketing mencatat permintaan customer, lalu menganalisis kesanggupan.
   - Jika tidak sanggup, order ditutup dengan alasan.
2. **Silabus & RAK.**
   - DPS meneruskan request ke UPT/Prodi.
   - UPT mengunggah Silabus/RPS, mengisi RAK per item, dan mengusulkan pengajar.
3. **Quotation & PO.**
   - Marketing menyesuaikan margin profit (misalnya RAK Rp10 jt menjadi penawaran Rp30 jt), lalu menerbitkan quotation.
   - Jika customer setuju, Marketing merekam PO.
   - Jika customer menolak, order dibatalkan.
4. **SPK.**
   - Draft SPK terisi otomatis dari RAK, PO, dan data order.
   - **Approval 1** oleh Kadep Marketing, lalu **Approval 2** oleh Kadep DPS.
   - Penolakan wajib disertai alasan dan mengembalikan SPK ke draf.
   - Nomor SPK terbit per jenis layanan, misalnya `SPK/006/TRN/D3/XI/2026`.
5. **Persiapan (DPS):**
   - Tetapkan pengajar; sistem **mendeteksi jadwal bentrok**.
   - Pengajar mengonfirmasi bersedia/tidak, lalu DPS menerbitkan **Surat Tugas**.
   - Ajukan PP pengadaan; sistem memberi peringatan bila diajukan < 14 hari sebelum pelaksanaan.
   - Booking ruang/lab, dengan cek bentrok dan kapasitas.
6. **Pelaksanaan dan laporan kegiatan DPS.** Setelah itu Marketing menerbitkan **BAST** untuk penagihan, dan order selesai.

**Fitur pendukung:**
- **Schedule Adjustment Log:** perubahan tanggal dicatat tanpa membatalkan SPK; booking fasilitas ikut bergeser.
- **Audit trail:** setiap keputusan dan perpindahan tahap tercatat.
- **Pengingat otomatis:** notifikasi dikirim saat sebuah tahap lewat SLA.

### Jenis layanan dan atribut wajib

Atribut khusus tiap layanan disimpan sebagai *Dynamic JSON Field* (kolom `order.detail`).

| Layanan | Atribut wajib |
|---|---|
| Training / Workshop | pax rate, jenis lokasi (in-house / Astratek) |
| Sertifikasi | skema, lembaga (LSP/Asosiasi), nilai per peserta, syarat kelulusan |
| Training + Sertifikasi | modul pelatihan, pax rate, skema, lembaga, nilai uji per peserta |
| Konsultasi | lingkup pekerjaan, metode (FGD / Gemba / Laporan Solusi), milestone, jadwal monitoring |
| Penyewaan Ruangan | nama ruangan, durasi sewa, fasilitas pendukung, jumlah pengguna |

### SLA default

Nilai SLA bisa diubah Admin.

| Tahap | Batas |
|---|---|
| Analisis RFQ | 2 hari |
| Silabus & RAK | 7 hari |
| Quotation sampai PO | 7 hari |
| Draft SPK | 2 hari |
| Approval 1 | 2 hari |
| Approval 2 | 2 hari |
| Laporan sampai BAST | 5 hari |
| Persiapan / pelaksanaan | mengikuti tanggal program |

## Peran

| Peran | Wewenang |
|---|---|
| Admin | Pengguna, UPT/Prodi, customer, fasilitas, SLA |
| Marketing | RFQ, analisis, quotation & margin, PO, draft SPK, BAST |
| Kadep Marketing | Approval 1 SPK |
| DPS | Teruskan request ke UPT, pengajar & Surat Tugas, PP, fasilitas, laporan kegiatan |
| Kadep DPS | Approval 2 SPK |
| UPT / Prodi | Silabus/RPS, RAK, usulan pengajar |
| Pengajar | Konfirmasi penugasan, jadwal, Surat Tugas |

Customer eksternal tidak login; datanya dikelola Marketing/Admin.

## Dokumen cetak

Quotation, SPK (template berbeda untuk tiap jenis layanan), Surat Tugas, dan BAST tersedia di `/cetak/...`. Gunakan **Cetak → Simpan sebagai PDF** di browser.

## Teknologi

- **Next.js 15** (App Router, Server Actions, TypeScript)
- **MySQL 8** bawaan **Laragon**, diakses lewat **Prisma ORM**
- Login dengan bcrypt dan cookie sesi bertanda tangan (`jose`); middleware membatasi area tiap peran

Versi sebelumnya (alur ISPK/SPK internal) tersimpan di riwayat git (commit `8dca27c`). Prototipe HTML awal ada di `legacy/`.

## Menjalankan dengan Laragon

1. Buka Laragon, lalu klik **Start All** agar MySQL berjalan di port 3306.
2. Salin konfigurasi:

   ```bash
   cp .env.example .env
   ```

   Isi `SESSION_SECRET` dengan string acak minimal 32 karakter.
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

## Akun demo

Semua akun memakai password `demo123`.

| Username | Peran |
|---|---|
| marketing | Marketing |
| kadepmkt | Kadep Marketing (ada SPK menunggu approval 1) |
| dps | DPS |
| kadepdps | Kadep DPS (ada SPK menunggu approval 2) |
| upt.inf / upt.mka | UPT Informatika / UPT Mekatronika |
| rudi, ayu, bayu, hendro | Pengajar (hendro eksternal; ayu punya penugasan menunggu konfirmasi) |
| admin | Admin |

Data demo berisi 14 order di semua tahap, termasuk:
- order yang lewat SLA,
- pengajar yang bentrok jadwal (Rudi di "Training Cyber Security Awareness"),
- PP yang diajukan kurang dari 14 hari sebelum pelaksanaan.
