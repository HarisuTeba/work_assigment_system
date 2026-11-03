// Aturan bisnis. Semua perubahan data dilakukan lewat fungsi Logic.* agar
// validasi, hak akses, perubahan status, dan notifikasi selalu konsisten.

const STATUS = {
  BARU: 'Baru',
  MENUNGGU: 'Menunggu Jawaban',
  DIKONFIRMASI: 'Dikonfirmasi',
  DIKERJAKAN: 'Dikerjakan',
  DILAPORKAN: 'Dilaporkan',
  REVISI: 'Perlu Revisi',
  DISETUJUI: 'Disetujui',
};
const STATUS_URUT = Object.values(STATUS);
const STATUS_KERJA = [STATUS.DIKONFIRMASI, STATUS.DIKERJAKAN, STATUS.REVISI];
const STATUS_SELESAI = [STATUS.DILAPORKAN, STATUS.DISETUJUI];

const JENIS = ['Tertulis', 'Lisan'];
const SIFAT = ['Perintah langsung', 'Permintaan', 'Anjuran', 'Sukarela'];
const PRIORITAS = ['Rendah', 'Sedang', 'Tinggi'];
const TINGKAT_TEGURAN = ['Lisan', 'SP1', 'SP2'];
const PERAN = { admin: 'Admin', atasan: 'Atasan', bawahan: 'Bawahan' };

const HARI = 86400000;
const JENDELA_EVALUASI = 30 * HARI;   // rentang untuk saran teguran
const JEDA_TEGURAN = 14 * HARI;       // saran disembunyikan bila baru saja ditegur
const BATAS_LAMPIRAN = 200 * 1024;    // localStorage terbatas, jadi lampiran dibatasi

class ValidasiError extends Error {}
function gagal(msg) { throw new ValidasiError(msg); }

// Waktu bisa "dibekukan" saat membuat data contoh.
const Clock = {
  fixed: null,
  now() { return this.fixed != null ? this.fixed : Date.now(); },
};
function now() { return Clock.now(); }

// Hash sederhana (FNV-1a). Cukup untuk demo; bukan pengamanan sungguhan.
function hashPassword(pw) {
  const s = 'wa-salt:' + pw;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

function teks(v) { return String(v ?? '').trim(); }
function wajib(v, label) {
  const t = teks(v);
  if (!t) gagal(`${label} wajib diisi.`);
  return t;
}
function wajibPeran(user, peran) {
  if (!user || user.peran !== peran) gagal('Anda tidak memiliki akses untuk tindakan ini.');
}
function skorValid(v, label) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 5) gagal(`Skor ${label} harus 1 sampai 5.`);
  return n;
}
function rata(nums) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

const Logic = {
  // ---------- Pencarian data ----------
  divisiNama(id) {
    const d = Store.get('divisi', id);
    return d ? d.nama : '-';
  },

  bawahanDari(atasan) {
    return Store.where('users', u =>
      u.peran === 'bawahan' && u.aktif && u.divisi_id === atasan.divisi_id);
  },

  langkahPerintah(perintahId) {
    return Store.where('langkah', l => l.perintah_id === perintahId)
      .sort((a, b) => a.urutan - b.urutan);
  },

  // Langkah beserta progresnya untuk satu penugasan, sesuai urutan.
  progresPenugasan(penugasan) {
    return this.langkahPerintah(penugasan.perintah_id).map(l => ({
      langkah: l,
      progres: Store.first('progres', x => x.penugasan_id === penugasan.id && x.langkah_id === l.id),
    }));
  },

  persen(penugasan) {
    const rows = this.progresPenugasan(penugasan);
    if (!rows.length) return 0;
    return Math.round(rows.filter(r => r.progres.selesai).length / rows.length * 100);
  },

  pertanyaan(penugasanId) {
    return Store.where('pertanyaan', q => q.penugasan_id === penugasanId)
      .sort((a, b) => a.ditanya_pada - b.ditanya_pada);
  },

  pertanyaanTerbuka(penugasanId) {
    return this.pertanyaan(penugasanId).filter(q => !q.jawaban);
  },

  laporan(penugasanId) {
    return Store.where('laporan', l => l.penugasan_id === penugasanId)
      .sort((a, b) => a.dikirim_pada - b.dikirim_pada);
  },

  evaluasi(penugasanId) {
    return Store.where('evaluasi', e => e.penugasan_id === penugasanId)
      .sort((a, b) => a.dibuat_pada - b.dibuat_pada);
  },

  penugasanPerintah(perintahId) {
    return Store.where('penugasan', p => p.perintah_id === perintahId);
  },

  penugasanAtasan(atasan) {
    const ids = new Set(Store.where('perintah', p => p.pemberi_id === atasan.id).map(p => p.id));
    return Store.where('penugasan', p => ids.has(p.perintah_id));
  },

  penugasanBawahan(user) {
    return Store.where('penugasan', p => p.penerima_id === user.id);
  },

  // Hak akses: bawahan hanya melihat penugasannya; atasan hanya perintah buatannya.
  penugasanMilikBawahan(user, pid) {
    const p = Store.get('penugasan', pid);
    if (!user || !p || p.penerima_id !== user.id) gagal('Penugasan tidak ditemukan.');
    return p;
  },

  penugasanMilikAtasan(user, pid) {
    const p = Store.get('penugasan', pid);
    const pr = p && Store.get('perintah', p.perintah_id);
    if (!user || !pr || pr.pemberi_id !== user.id) gagal('Penugasan tidak ditemukan.');
    return { p, pr };
  },

  perintahMilikAtasan(user, id) {
    const pr = Store.get('perintah', id);
    if (!user || !pr || pr.pemberi_id !== user.id) gagal('Perintah tidak ditemukan.');
    return pr;
  },

  bawahanMilikAtasan(atasan, penerimaId) {
    const b = this.bawahanDari(atasan).find(u => u.id === Number(penerimaId));
    if (!b) gagal('Pilih bawahan dari divisi Anda.');
    return b;
  },

  notify(userId, pesan, tautan) {
    Store.insert('notifikasi', { user_id: userId, pesan, tautan, dibaca: false, dibuat_pada: now() });
  },

  // ---------- Akun ----------
  login(username, password) {
    const u = Store.first('users', x => x.username === teks(username).toLowerCase());
    if (!u || u.password !== hashPassword(password)) gagal('Username atau password salah.');
    if (!u.aktif) gagal('Akun ini dinonaktifkan. Hubungi admin.');
    return u;
  },

  gantiPassword(user, lama, baru, ulang) {
    if (user.password !== hashPassword(lama)) gagal('Password lama salah.');
    if (teks(baru).length < 6) gagal('Password baru minimal 6 karakter.');
    if (baru !== ulang) gagal('Konfirmasi password tidak sama.');
    user.password = hashPassword(baru);
    Store.save();
  },

  // ---------- Admin ----------
  simpanDivisi(admin, id, nama) {
    wajibPeran(admin, 'admin');
    nama = wajib(nama, 'Nama divisi');
    const dup = Store.first('divisi', d => d.nama.toLowerCase() === nama.toLowerCase() && d.id !== id);
    if (dup) gagal('Nama divisi sudah dipakai.');
    if (id) Store.update('divisi', id, { nama });
    else Store.insert('divisi', { nama });
    Store.save();
  },

  hapusDivisi(admin, id) {
    wajibPeran(admin, 'admin');
    if (Store.first('users', u => u.divisi_id === id)) gagal('Divisi masih memiliki anggota. Pindahkan anggotanya dulu.');
    Store.remove('divisi', id);
    Store.save();
  },

  simpanUser(admin, id, data) {
    wajibPeran(admin, 'admin');
    const nama = wajib(data.nama, 'Nama');
    const username = wajib(data.username, 'Username').toLowerCase();
    if (!/^[a-z0-9._]{3,20}$/.test(username)) gagal('Username 3–20 karakter: huruf kecil, angka, titik, atau garis bawah.');
    if (Store.first('users', u => u.username === username && u.id !== id)) gagal('Username sudah dipakai.');
    const peran = data.peran;
    if (!PERAN[peran]) gagal('Peran tidak valid.');
    const jabatan = wajib(data.jabatan, 'Jabatan');
    let divisi_id = null;
    if (peran !== 'admin') {
      divisi_id = Number(data.divisi_id);
      if (!Store.get('divisi', divisi_id)) gagal('Pilih divisi.');
    }
    const pw = data.password || '';
    if (!id && pw.length < 6) gagal('Password minimal 6 karakter.');
    if (id && pw && pw.length < 6) gagal('Password baru minimal 6 karakter.');
    if (id === admin.id && peran !== 'admin') gagal('Anda tidak bisa mengubah peran akun sendiri.');

    const row = { nama, username, peran, jabatan, divisi_id };
    if (pw) row.password = hashPassword(pw);
    if (id) Store.update('users', id, row);
    else Store.insert('users', { ...row, aktif: true });
    Store.save();
  },

  setAktif(admin, id, aktif) {
    wajibPeran(admin, 'admin');
    if (id === admin.id) gagal('Anda tidak bisa menonaktifkan akun sendiri.');
    Store.update('users', id, { aktif });
    Store.save();
  },

  // ---------- Perintah ----------
  buatPerintah(atasan, data) {
    wajibPeran(atasan, 'atasan');
    const judul = wajib(data.judul, 'Judul');
    if (judul.length > 120) gagal('Judul maksimal 120 karakter.');
    if (!JENIS.includes(data.jenis)) gagal('Pilih jenis perintah.');
    if (!SIFAT.includes(data.sifat)) gagal('Pilih sifat perintah.');
    if (!PRIORITAS.includes(data.prioritas)) gagal('Pilih prioritas.');
    const apa = wajib(data.apa, 'Apa (tugas yang dikerjakan)');
    const mengapa = wajib(data.mengapa, 'Mengapa (tujuan)');
    const di_mana = wajib(data.di_mana, 'Di mana');
    const bagaimana = wajib(data.bagaimana, 'Bagaimana (cara/standar hasil)');
    const tenggat = Number(data.tenggat);
    if (!tenggat) gagal('Kapan (tenggat) wajib diisi.');
    if (tenggat <= now()) gagal('Tenggat harus di masa depan.');
    const catatan_lisan = teks(data.catatan_lisan);
    if (data.jenis === 'Lisan' && !catatan_lisan) gagal('Perintah lisan wajib dicatat ringkasannya sebagai bukti tertulis.');
    const langkah = (data.langkah || []).map(teks).filter(Boolean);
    if (!langkah.length) gagal('Tambahkan minimal 1 langkah.');
    const penerimaIds = [...new Set((data.penerima || []).map(Number))];
    if (!penerimaIds.length) gagal('Siapa: pilih minimal 1 penerima.');
    const penerima = penerimaIds.map(id => this.bawahanMilikAtasan(atasan, id));

    const t = now();
    const pr = Store.insert('perintah', {
      pemberi_id: atasan.id, judul, jenis: data.jenis, sifat: data.sifat, prioritas: data.prioritas,
      apa, mengapa, di_mana, bagaimana, tenggat, catatan_lisan: data.jenis === 'Lisan' ? catatan_lisan : '',
      dibuat_pada: t,
    });
    const langkahRows = langkah.map((deskripsi, i) =>
      Store.insert('langkah', { perintah_id: pr.id, urutan: i + 1, deskripsi }));
    penerima.forEach(b => {
      const p = Store.insert('penugasan', {
        perintah_id: pr.id, penerima_id: b.id, status: STATUS.BARU, terlambat: false,
        dikonfirmasi_pada: null, dilaporkan_pada: null, dibuat_pada: t,
      });
      langkahRows.forEach(l => Store.insert('progres', {
        penugasan_id: p.id, langkah_id: l.id, selesai: false, catatan: '', selesai_pada: null,
      }));
      this.notify(b.id, `Perintah baru dari ${atasan.nama}: "${judul}"`, `#/tugas/${p.id}`);
    });
    Store.save();
    return pr;
  },

  // ---------- Konfirmasi & tanya-jawab ----------
  tanya(user, pid, isi) {
    const p = this.penugasanMilikBawahan(user, pid);
    if (STATUS_SELESAI.includes(p.status)) gagal('Penugasan sudah dilaporkan; gunakan laporan untuk menyampaikan hal lain.');
    isi = wajib(isi, 'Pertanyaan');
    Store.insert('pertanyaan', { penugasan_id: p.id, isi, jawaban: '', ditanya_pada: now(), dijawab_pada: null });
    if (p.status === STATUS.BARU) p.status = STATUS.MENUNGGU;
    const pr = Store.get('perintah', p.perintah_id);
    this.notify(pr.pemberi_id, `${user.nama} bertanya tentang "${pr.judul}"`, `#/penugasan/${p.id}`);
    Store.save();
  },

  jawab(atasan, qid, jawaban) {
    const q = Store.get('pertanyaan', qid);
    if (!q) gagal('Pertanyaan tidak ditemukan.');
    const { p, pr } = this.penugasanMilikAtasan(atasan, q.penugasan_id);
    if (q.jawaban) gagal('Pertanyaan ini sudah dijawab.');
    q.jawaban = wajib(jawaban, 'Jawaban');
    q.dijawab_pada = now();
    if (p.status === STATUS.MENUNGGU && !this.pertanyaanTerbuka(p.id).length) p.status = STATUS.BARU;
    this.notify(p.penerima_id, `${atasan.nama} menjawab pertanyaan Anda di "${pr.judul}"`, `#/tugas/${p.id}`);
    Store.save();
  },

  konfirmasi(user, pid) {
    const p = this.penugasanMilikBawahan(user, pid);
    if (p.status === STATUS.MENUNGGU) gagal('Masih ada pertanyaan yang belum dijawab atasan.');
    if (p.status !== STATUS.BARU) gagal('Penugasan ini sudah dikonfirmasi.');
    p.status = STATUS.DIKONFIRMASI;
    p.dikonfirmasi_pada = now();
    const pr = Store.get('perintah', p.perintah_id);
    this.notify(pr.pemberi_id, `${user.nama} memahami dan menerima "${pr.judul}"`, `#/penugasan/${p.id}`);
    Store.save();
  },

  // ---------- Pengerjaan ----------
  selesaikanLangkah(user, pid, langkahId, catatan) {
    const p = this.penugasanMilikBawahan(user, pid);
    if (p.status === STATUS.BARU || p.status === STATUS.MENUNGGU) gagal('Konfirmasi bahwa Anda paham perintah ini terlebih dahulu.');
    if (!STATUS_KERJA.includes(p.status)) gagal('Penugasan ini tidak sedang dikerjakan.');
    const rows = this.progresPenugasan(p);
    const idx = rows.findIndex(r => r.langkah.id === langkahId);
    if (idx < 0) gagal('Langkah tidak ditemukan.');
    if (rows[idx].progres.selesai) gagal('Langkah ini sudah selesai.');
    if (rows.slice(0, idx).some(r => !r.progres.selesai)) gagal('Selesaikan langkah sebelumnya terlebih dahulu.');
    Object.assign(rows[idx].progres, { selesai: true, catatan: teks(catatan), selesai_pada: now() });
    if (p.status === STATUS.DIKONFIRMASI) p.status = STATUS.DIKERJAKAN;
    Store.save();
  },

  kirimLaporan(user, pid, data) {
    const p = this.penugasanMilikBawahan(user, pid);
    if (![STATUS.DIKERJAKAN, STATUS.REVISI].includes(p.status)) gagal('Laporan hanya bisa dikirim saat penugasan dikerjakan.');
    if (this.progresPenugasan(p).some(r => !r.progres.selesai)) gagal('Selesaikan semua langkah sebelum mengirim laporan akhir.');
    const hasil = wajib(data.hasil, 'Ringkasan hasil');
    const lampiran = data.lampiran || null;
    if (lampiran && lampiran.ukuran > BATAS_LAMPIRAN) gagal('Lampiran maksimal 200 KB.');
    const t = now();
    const pr = Store.get('perintah', p.perintah_id);
    Store.insert('laporan', { penugasan_id: p.id, hasil, kendala: teks(data.kendala), lampiran, dikirim_pada: t });
    p.status = STATUS.DILAPORKAN;
    p.dilaporkan_pada = t;
    if (t > pr.tenggat) p.terlambat = true;
    this.notify(pr.pemberi_id, `${user.nama} mengirim laporan akhir "${pr.judul}"`, `#/penugasan/${p.id}`);
    Store.save();
  },

  // Penugasan yang belum dilaporkan saat tenggat lewat ditandai Terlambat.
  refreshTerlambat() {
    let berubah = false;
    Store.all('penugasan').forEach(p => {
      if (p.terlambat || STATUS_SELESAI.includes(p.status)) return;
      const pr = Store.get('perintah', p.perintah_id);
      if (pr && now() > pr.tenggat) { p.terlambat = true; berubah = true; }
    });
    if (berubah) Store.save();
  },

  // ---------- Evaluasi & reward ----------
  hitungPoin(rataSkor, tepatWaktu) {
    return Math.round(rataSkor * 10) + (tepatWaktu ? 10 : 0);
  },

  evaluasiPenugasan(atasan, pid, data) {
    const { p, pr } = this.penugasanMilikAtasan(atasan, pid);
    if (p.status !== STATUS.DILAPORKAN) gagal('Hanya penugasan yang sudah dilaporkan yang bisa dievaluasi.');
    const skor_waktu = skorValid(data.skor_waktu, 'ketepatan waktu');
    const skor_kualitas = skorValid(data.skor_kualitas, 'kualitas hasil');
    const skor_kesesuaian = skorValid(data.skor_kesesuaian, 'kesesuaian instruksi');
    if (!['setujui', 'revisi'].includes(data.keputusan)) gagal('Pilih keputusan: setujui atau revisi.');
    const umpan_balik = teks(data.umpan_balik);
    if (data.keputusan === 'revisi' && !umpan_balik) gagal('Tuliskan apa yang perlu direvisi pada umpan balik.');

    const t = now();
    Store.insert('evaluasi', {
      penugasan_id: p.id, skor_waktu, skor_kualitas, skor_kesesuaian,
      umpan_balik, keputusan: data.keputusan, dibuat_pada: t,
    });
    if (data.keputusan === 'setujui') {
      p.status = STATUS.DISETUJUI;
      const lap = this.laporan(p.id).pop();
      const tepat = !!lap && lap.dikirim_pada <= pr.tenggat;
      const poin = this.hitungPoin(rata([skor_waktu, skor_kualitas, skor_kesesuaian]), tepat);
      Store.insert('reward', {
        penerima_id: p.penerima_id, penugasan_id: p.id, jenis: 'otomatis', poin,
        pesan: `Poin evaluasi "${pr.judul}"${tepat ? ' (termasuk bonus tepat waktu)' : ''}`,
        pemberi_id: atasan.id, dibuat_pada: t,
      });
      this.notify(p.penerima_id, `"${pr.judul}" disetujui. Anda mendapat ${poin} poin.`, `#/tugas/${p.id}`);
    } else {
      p.status = STATUS.REVISI;
      const mulai = Number(data.buka_mulai) || 0;
      if (mulai) {
        this.progresPenugasan(p).forEach(r => {
          if (r.langkah.urutan >= mulai) Object.assign(r.progres, { selesai: false, selesai_pada: null });
        });
      }
      this.notify(p.penerima_id, `"${pr.judul}" perlu revisi. Lihat umpan balik atasan.`, `#/tugas/${p.id}`);
    }
    Store.save();
  },

  beriReward(atasan, data) {
    wajibPeran(atasan, 'atasan');
    const b = this.bawahanMilikAtasan(atasan, data.penerima_id);
    if (!['pujian', 'sertifikat'].includes(data.jenis)) gagal('Pilih jenis reward.');
    let poin = 0;
    if (data.jenis === 'pujian') {
      poin = Number(data.poin);
      if (!Number.isInteger(poin) || poin < 0 || poin > 20) gagal('Poin bonus pujian 0 sampai 20.');
    }
    const pesan = wajib(data.pesan, 'Pesan apresiasi');
    Store.insert('reward', {
      penerima_id: b.id, penugasan_id: null, jenis: data.jenis, poin, pesan,
      pemberi_id: atasan.id, dibuat_pada: now(),
    });
    const label = data.jenis === 'sertifikat' ? 'Sertifikat Karyawan Teladan' : `pujian${poin ? ` (+${poin} poin)` : ''}`;
    this.notify(b.id, `${atasan.nama} memberi Anda ${label}.`, '#/nilai');
    Store.save();
  },

  // ---------- Teguran ----------
  beriTeguran(atasan, data) {
    wajibPeran(atasan, 'atasan');
    const b = this.bawahanMilikAtasan(atasan, data.penerima_id);
    if (!TINGKAT_TEGURAN.includes(data.tingkat)) gagal('Pilih tingkat teguran.');
    const alasan = wajib(data.alasan, 'Alasan');
    const catatan_pembinaan = wajib(data.catatan_pembinaan, 'Catatan pembinaan');
    Store.insert('teguran', {
      penerima_id: b.id, pemberi_id: atasan.id, tingkat: data.tingkat, alasan,
      catatan_pembinaan, dibaca_pada: null, dibuat_pada: now(),
    });
    this.notify(b.id, `Anda menerima teguran (${data.tingkat}) dari ${atasan.nama}.`, '#/teguran-saya');
    Store.save();
  },

  tandaiTeguranDibaca(user, id) {
    const t = Store.get('teguran', id);
    if (!t || t.penerima_id !== user.id) gagal('Teguran tidak ditemukan.');
    if (!t.dibaca_pada) {
      t.dibaca_pada = now();
      this.notify(t.pemberi_id, `${user.nama} telah membaca teguran ${t.tingkat}.`, '#/teguran');
      Store.save();
    }
  },

  // ---------- Statistik ----------
  skorRata(e) { return (e.skor_waktu + e.skor_kualitas + e.skor_kesesuaian) / 3; },

  totalPoin(uid) {
    return Store.where('reward', r => r.penerima_id === uid).reduce((a, r) => a + r.poin, 0);
  },

  // Nilai akhir = evaluasi yang disetujui (evaluasi revisi tidak dihitung dua kali).
  evaluasiFinal(uid, sejak = 0) {
    const pids = new Set(Store.where('penugasan', p => p.penerima_id === uid).map(p => p.id));
    return Store.where('evaluasi', e => pids.has(e.penugasan_id) && e.keputusan === 'setujui' && e.dibuat_pada >= sejak);
  },

  rataNilai(uid, sejak = 0) {
    return rata(this.evaluasiFinal(uid, sejak).map(e => this.skorRata(e)));
  },

  saranTeguran(atasan) {
    const sejak = now() - JENDELA_EVALUASI;
    const hasil = [];
    this.bawahanDari(atasan).forEach(b => {
      const terlambat = this.penugasanBawahan(b).filter(p => {
        const pr = Store.get('perintah', p.perintah_id);
        return p.terlambat && pr.tenggat >= sejak && pr.tenggat <= now();
      });
      const nilai = this.rataNilai(b.id, sejak);
      const alasan = [];
      if (terlambat.length >= 2) alasan.push(`${terlambat.length}× terlambat dalam 30 hari`);
      if (nilai != null && nilai < 3) alasan.push(`nilai rata-rata ${nilai.toFixed(2)} (< 3) dalam 30 hari`);
      if (!alasan.length) return;
      const riwayat = Store.where('teguran', t => t.penerima_id === b.id);
      if (riwayat.some(t => t.dibuat_pada >= now() - JEDA_TEGURAN)) return;
      const saranTingkat = TINGKAT_TEGURAN[Math.min(riwayat.length, TINGKAT_TEGURAN.length - 1)];
      hasil.push({ user: b, alasan, saranTingkat, jumlahTeguran: riwayat.length });
    });
    return hasil;
  },

  peringkat(divisiId) {
    return Store.where('users', u => u.peran === 'bawahan' && u.aktif && u.divisi_id === divisiId)
      .map(u => ({
        user: u,
        poin: this.totalPoin(u.id),
        nilai: this.rataNilai(u.id),
        selesai: this.evaluasiFinal(u.id).length,
        sertifikat: Store.where('reward', r => r.penerima_id === u.id && r.jenis === 'sertifikat').length,
      }))
      .sort((a, b) => b.poin - a.poin || (b.nilai || 0) - (a.nilai || 0));
  },
};
