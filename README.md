# Sistem Pemberian Perintah & Tugas

Aplikasi web untuk mendigitalkan pemberian perintah dari atasan ke bawahan, lengkap dengan konfirmasi pemahaman, pengerjaan langkah demi langkah, laporan, evaluasi, reward, dan teguran (pembinaan).
Dibuat untuk mata kuliah **Teknik Supervisi**.

## Cara menjalankan

Tidak perlu instalasi. Cukup buka `index.html` di browser (Chrome, Edge, atau Firefox).

Cara lain adalah lewat server lokal:

```bash
python -m http.server 5173
```

Setelah itu buka <http://localhost:5173>.

Data tersimpan di **localStorage** browser. Tombol **Reset data demo** (di halaman login atau Profil) mengembalikan semua data ke contoh awal.

## Akun demo

Semua akun memakai password `demo123`.

| Username | Peran | Keterangan |
|---|---|---|
| `admin` | Admin | Kelola divisi & pengguna |
| `budi` | Atasan | Kepala Bagian Pemasaran |
| `siti`, `andi`, `dewi` | Bawahan | Staf Pemasaran (Dewi sengaja dibuat perlu pembinaan) |
| `rina` | Atasan | Kepala Bagian Keuangan |
| `joko`, `maya`, `fajar` | Bawahan | Staf Keuangan |

## Alur bisnis

1. **Admin** membuat divisi dan akun. Relasi atasan–bawahan ditentukan oleh divisi.
2. **Atasan** membuat perintah dengan:
   - jenis (tertulis atau lisan; perintah lisan wajib dicatat ringkasannya)
   - sifat (langsung, permintaan, anjuran, atau sukarela)
   - prioritas
   - instruksi **5W1H**
   - **langkah berurutan**

   Satu perintah bisa dikirim ke beberapa bawahan, dan tiap bawahan mendapat penugasan sendiri.
3. **Bawahan** wajib **konfirmasi paham** atau mengajukan pertanyaan dulu. Langkah pengerjaan terkunci sampai konfirmasi dilakukan.
4. Bawahan mengerjakan langkah **satu per satu**: langkah berikutnya terbuka setelah langkah sebelumnya selesai. Setelah semua langkah selesai, bawahan mengirim **laporan akhir**.
5. **Atasan mengevaluasi** dengan skor 1–5 untuk ketepatan waktu, kualitas, dan kesesuaian instruksi, ditambah umpan balik. Hasilnya **Setujui** atau **Revisi** (atasan bisa membuka ulang langkah tertentu).
6. **Reward**:
   - Saat disetujui, poin otomatis = rata-rata skor × 10, ditambah 10 jika tepat waktu.
   - Atasan bisa memberi pujian (poin bonus 0–20) atau sertifikat "Karyawan Teladan".
   - Papan peringkat per divisi.
7. **Teguran**: sistem memberi saran bila dalam 30 hari staf terlambat ≥ 2 kali atau nilai rata-ratanya < 3. Atasan memutuskan tingkatnya (Lisan, SP1, atau SP2) dan menulis catatan pembinaan. Bawahan menandai teguran sudah dibaca.

Status penugasan: `Baru → Menunggu Jawaban → Dikonfirmasi → Dikerjakan → Dilaporkan → Disetujui` (atau `Perlu Revisi`). Penanda **Terlambat** muncul otomatis bila tenggat terlewati.

## Kaitan dengan materi

| Materi | Fitur |
|---|---|
| Perintah lisan / tertulis | Pilihan jenis + catatan bukti perintah lisan |
| Instruksi jelas | Form 5W1H wajib |
| Satu per satu | Langkah berurutan yang terkunci |
| Memastikan bawahan paham | Konfirmasi wajib + tanya-jawab klarifikasi |
| Pengawasan | Progres per langkah, penanda terlambat, dashboard tim |
| Evaluasi | Skor 3 aspek, umpan balik, revisi |
| Reward | Poin otomatis, pujian, sertifikat, peringkat |
| Pembinaan / teguran | Saran sistem + teguran bertingkat + catatan pembinaan |
| Tugas supervisor | Merencanakan, membagi tugas, mengontrol, menilai, membina |

## Struktur file

```
index.html
design.md           sistem desain (warna, tipografi, aturan komponen)
tokens.css          token warna/spasi/font (terang + gelap)
css/style.css
js/store.js         penyimpanan localStorage
js/logic.js         aturan bisnis (validasi, status, poin, saran teguran)
js/seed.js          data contoh
js/ui.js            helper tampilan
js/pages/*.js       halaman per peran (common, admin, atasan, bawahan)
js/app.js           router & layout
```

> Catatan: aplikasi ini adalah prototipe. Password hanya di-hash sederhana dan data disimpan di browser, jadi aplikasi ini tidak untuk dipakai di produksi.
