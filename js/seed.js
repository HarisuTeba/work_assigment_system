// Data contoh. Skenario dijalankan lewat Logic.* dengan waktu yang dibekukan,
// sehingga status, poin, dan notifikasinya sama persis dengan pemakaian nyata.
const PASSWORD_DEMO = 'demo123';

const Seed = {
  run() {
    const t0 = Date.now();
    // Hari relatif terhadap sekarang (negatif = lampau) pada jam tertentu.
    const at = (hari, jam = 9) => {
      const d = new Date(t0 + hari * HARI);
      d.setHours(jam, 0, 0, 0);
      return d.getTime();
    };
    const pada = (ms, fn) => {
      Clock.fixed = Math.min(ms, t0);
      try { return fn(); } finally { Clock.fixed = null; }
    };

    const pw = hashPassword(PASSWORD_DEMO);
    const user = (nama, username, peran, jabatan, divisi_id) =>
      Store.insert('users', { nama, username, password: pw, peran, jabatan, divisi_id, aktif: true });

    const pemasaran = Store.insert('divisi', { nama: 'Pemasaran' });
    const keuangan = Store.insert('divisi', { nama: 'Keuangan' });

    user('Admin HR', 'admin', 'admin', 'Admin HR', null);
    const budi = user('Budi Santoso', 'budi', 'atasan', 'Kepala Bagian Pemasaran', pemasaran.id);
    const siti = user('Siti Rahma', 'siti', 'bawahan', 'Staf Pemasaran', pemasaran.id);
    const andi = user('Andi Pratama', 'andi', 'bawahan', 'Staf Pemasaran', pemasaran.id);
    const dewi = user('Dewi Lestari', 'dewi', 'bawahan', 'Staf Pemasaran', pemasaran.id);
    const rina = user('Rina Wulandari', 'rina', 'atasan', 'Kepala Bagian Keuangan', keuangan.id);
    const joko = user('Joko Susilo', 'joko', 'bawahan', 'Staf Keuangan', keuangan.id);
    const maya = user('Maya Putri', 'maya', 'bawahan', 'Staf Keuangan', keuangan.id);
    const fajar = user('Fajar Nugroho', 'fajar', 'bawahan', 'Staf Keuangan', keuangan.id);

    const tugasDari = (pr, u) => Store.first('penugasan', p => p.perintah_id === pr.id && p.penerima_id === u.id);
    // Menyelesaikan langkah satu per satu pada waktu-waktu yang diberikan.
    const kerjakan = (u, p, waktuList) => {
      Logic.progresPenugasan(p).forEach((r, i) => {
        if (waktuList[i]) pada(waktuList[i], () => Logic.selesaikanLangkah(u, p.id, r.langkah.id, ''));
      });
    };

    // 1. Laporan penjualan: Siti tepat waktu & disetujui, Andi terlambat & menunggu evaluasi.
    const p1 = pada(at(-10), () => Logic.buatPerintah(budi, {
      judul: 'Laporan penjualan bulanan Oktober', jenis: 'Tertulis', sifat: 'Perintah langsung', prioritas: 'Tinggi',
      apa: 'Menyusun laporan penjualan bulan Oktober untuk rapat direksi.',
      mengapa: 'Direksi membutuhkan data untuk menentukan target kuartal berikutnya.',
      di_mana: 'Data dari sistem kasir pusat; laporan dikirim ke email bagian pemasaran.',
      bagaimana: 'Format PDF maksimal 5 halaman, berisi tabel per produk, per wilayah, dan grafik tren.',
      tenggat: at(-3, 17),
      langkah: ['Tarik data transaksi dari sistem kasir', 'Rekap penjualan per produk dan per wilayah', 'Buat grafik dan analisis singkat', 'Kirim laporan dalam format PDF'],
      penerima: [siti.id, andi.id],
    }));
    const p1s = tugasDari(p1, siti);
    pada(at(-10, 11), () => Logic.tanya(siti, p1s.id, 'Apakah data retur ikut dihitung dalam penjualan?'));
    const q1 = Logic.pertanyaan(p1s.id)[0];
    pada(at(-10, 13), () => Logic.jawab(budi, q1.id, 'Ya, tetapi tampilkan retur di kolom terpisah.'));
    pada(at(-10, 14), () => Logic.konfirmasi(siti, p1s.id));
    kerjakan(siti, p1s, [at(-9), at(-8), at(-6), at(-5, 10)]);
    pada(at(-5, 15), () => Logic.kirimLaporan(siti, p1s.id, { hasil: 'Laporan 4 halaman sudah dikirim. Penjualan naik 12% dibanding September.', kendala: '' }));
    pada(at(-4, 10), () => Logic.evaluasiPenugasan(budi, p1s.id, { skor_waktu: 5, skor_kualitas: 5, skor_kesesuaian: 4, keputusan: 'setujui', umpan_balik: 'Rapi dan lengkap. Analisis wilayah bisa lebih tajam.' }));

    const p1a = tugasDari(p1, andi);
    pada(at(-9), () => Logic.konfirmasi(andi, p1a.id));
    kerjakan(andi, p1a, [at(-7), at(-4), at(-3, 10), at(-2)]);
    pada(at(-2, 10), () => Logic.kirimLaporan(andi, p1a.id, { hasil: 'Laporan selesai, terlampir dalam email.', kendala: 'Akses sistem kasir sempat gangguan 1 hari.' }));

    // 2 & 3. Dewi: dua kali terlambat dan nilai rendah -> muncul di saran teguran.
    const p2 = pada(at(-8), () => Logic.buatPerintah(budi, {
      judul: 'Follow-up 15 klien prospek dari pameran', jenis: 'Tertulis', sifat: 'Perintah langsung', prioritas: 'Sedang',
      apa: 'Menghubungi 15 klien prospek yang mengisi formulir di pameran.',
      mengapa: 'Agar prospek tidak hilang dan bisa dikonversi menjadi penjualan.',
      di_mana: 'Melalui telepon kantor; hasil dicatat di CRM.',
      bagaimana: 'Setiap klien dihubungi minimal sekali, respon dicatat, klien tertarik dijadwalkan demo.',
      tenggat: at(-2, 17),
      langkah: ['Hubungi klien via telepon', 'Catat respon di CRM', 'Jadwalkan demo untuk klien yang tertarik'],
      penerima: [dewi.id],
    }));
    const p2d = tugasDari(p2, dewi);
    pada(at(-7), () => Logic.konfirmasi(dewi, p2d.id));
    kerjakan(dewi, p2d, [at(-5)]);

    const p3 = pada(at(-20), () => Logic.buatPerintah(budi, {
      judul: 'Siapkan materi presentasi produk baru', jenis: 'Lisan', sifat: 'Permintaan', prioritas: 'Sedang',
      apa: 'Menyiapkan slide presentasi peluncuran produk baru.',
      mengapa: 'Dipakai tim sales saat kunjungan ke klien korporat.',
      di_mana: 'Disimpan di folder bersama divisi Pemasaran.',
      bagaimana: 'Maksimal 15 slide, memakai template perusahaan, mencantumkan harga dan keunggulan.',
      catatan_lisan: 'Disampaikan saat rapat mingguan Senin pagi di ruang rapat 2.',
      tenggat: at(-14, 17),
      langkah: ['Kumpulkan spesifikasi dari tim produk', 'Susun draf slide', 'Finalisasi dan unggah ke folder bersama'],
      penerima: [dewi.id],
    }));
    const p3d = tugasDari(p3, dewi);
    pada(at(-19), () => Logic.konfirmasi(dewi, p3d.id));
    kerjakan(dewi, p3d, [at(-17), at(-15), at(-13, 9)]);
    pada(at(-13, 10), () => Logic.kirimLaporan(dewi, p3d.id, { hasil: 'Slide sudah diunggah.', kendala: 'Spesifikasi dari tim produk terlambat.' }));
    pada(at(-12), () => Logic.evaluasiPenugasan(budi, p3d.id, { skor_waktu: 2, skor_kualitas: 3, skor_kesesuaian: 3, keputusan: 'setujui', umpan_balik: 'Materi kurang mendalam dan terlambat 1 hari. Lain kali segera lapor jika ada hambatan.' }));

    // 4. Perintah lisan baru: Siti bertanya (menunggu jawaban), Andi belum membuka.
    const p4 = pada(t0 - 3 * 3600000, () => Logic.buatPerintah(budi, {
      judul: 'Update konten media sosial minggu ini', jenis: 'Lisan', sifat: 'Perintah langsung', prioritas: 'Rendah',
      apa: 'Membuat dan menjadwalkan konten Instagram untuk satu minggu.',
      mengapa: 'Menjaga interaksi pelanggan menjelang promo akhir bulan.',
      di_mana: 'Akun Instagram resmi perusahaan.',
      bagaimana: 'Ikuti panduan warna merek; setiap posting disetujui atasan sebelum tayang.',
      catatan_lisan: 'Disampaikan saat briefing pagi hari ini.',
      tenggat: at(5, 17),
      langkah: ['Susun kalender konten', 'Buat desain posting', 'Jadwalkan posting'],
      penerima: [siti.id, andi.id],
    }));
    pada(t0 - 2 * 3600000, () => Logic.tanya(siti, tugasDari(p4, siti).id, 'Berapa jumlah posting per hari yang diharapkan?'));

    // 5. Sedang dikerjakan.
    const p5 = pada(at(-3), () => Logic.buatPerintah(budi, {
      judul: 'Survei kepuasan pelanggan Q4', jenis: 'Tertulis', sifat: 'Anjuran', prioritas: 'Sedang',
      apa: 'Menyebarkan dan merekap survei kepuasan pelanggan.',
      mengapa: 'Mengukur kualitas layanan sebagai bahan evaluasi akhir tahun.',
      di_mana: 'Google Form dikirim ke daftar pelanggan aktif.',
      bagaimana: 'Minimal 100 responden; rekap dalam bentuk persentase per pertanyaan.',
      tenggat: at(4, 17),
      langkah: ['Susun pertanyaan survei', 'Sebarkan ke pelanggan', 'Rekap hasil survei'],
      penerima: [siti.id],
    }));
    const p5s = tugasDari(p5, siti);
    pada(at(-3, 10), () => Logic.konfirmasi(siti, p5s.id));
    kerjakan(siti, p5s, [at(-2, 11)]);
    pada(at(-4, 11), () => Logic.beriReward(budi, { penerima_id: siti.id, jenis: 'pujian', poin: 10, pesan: 'Terima kasih sudah aktif bertanya sebelum mengerjakan laporan.' }));

    // 6 & 7. Divisi Keuangan.
    const p6 = pada(at(-5), () => Logic.buatPerintah(rina, {
      judul: 'Rekonsiliasi kas kecil Oktober', jenis: 'Tertulis', sifat: 'Perintah langsung', prioritas: 'Tinggi',
      apa: 'Mencocokkan saldo kas kecil dengan bukti pengeluaran.',
      mengapa: 'Persiapan audit internal akhir bulan.',
      di_mana: 'Ruang keuangan; dokumen fisik dan buku kas.',
      bagaimana: 'Semua bukti diperiksa; selisih dicatat dalam berita acara.',
      tenggat: at(3, 17),
      langkah: ['Kumpulkan seluruh bukti pengeluaran', 'Cocokkan dengan buku kas', 'Buat berita acara selisih (jika ada)'],
      penerima: [joko.id, maya.id],
    }));
    const p6j = tugasDari(p6, joko);
    pada(at(-5, 10), () => Logic.konfirmasi(joko, p6j.id));
    kerjakan(joko, p6j, [at(-4), at(-2)]);
    pada(at(-4), () => Logic.konfirmasi(maya, tugasDari(p6, maya).id));

    const p7 = pada(at(-15), () => Logic.buatPerintah(rina, {
      judul: 'Rekap reimburse karyawan September', jenis: 'Tertulis', sifat: 'Perintah langsung', prioritas: 'Sedang',
      apa: 'Merekap seluruh pengajuan reimburse bulan September.',
      mengapa: 'Agar pembayaran reimburse bisa diproses tepat waktu.',
      di_mana: 'Sistem pengajuan reimburse internal.',
      bagaimana: 'Rekap per karyawan dalam Excel, tandai pengajuan tanpa bukti.',
      tenggat: at(-8, 17),
      langkah: ['Unduh data pengajuan', 'Verifikasi bukti', 'Susun rekap per karyawan'],
      penerima: [fajar.id],
    }));
    const p7f = tugasDari(p7, fajar);
    pada(at(-15, 10), () => Logic.konfirmasi(fajar, p7f.id));
    kerjakan(fajar, p7f, [at(-13), at(-11), at(-10)]);
    pada(at(-10, 15), () => Logic.kirimLaporan(fajar, p7f.id, { hasil: 'Rekap 42 pengajuan selesai, 3 pengajuan tanpa bukti ditandai.', kendala: '' }));
    pada(at(-9), () => Logic.evaluasiPenugasan(rina, p7f.id, { skor_waktu: 5, skor_kualitas: 5, skor_kesesuaian: 5, keputusan: 'setujui', umpan_balik: 'Sangat teliti.' }));
    pada(at(-9, 11), () => Logic.beriReward(rina, { penerima_id: fajar.id, jenis: 'sertifikat', pesan: 'Karyawan Teladan September: rekap tanpa selisih.' }));

    // Notifikasi lama dianggap sudah dibaca.
    Store.all('notifikasi').forEach(n => { if (n.dibuat_pada < t0 - HARI) n.dibaca = true; });
  },
};
