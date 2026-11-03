// Data demo: dua divisi dengan ISPK/SPK di berbagai tahap alur.
// Semua tanggal relatif terhadap saat seed dijalankan agar demo selalu "hidup".
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { AksiPengesahan, JenisPerintah, Keputusan, Peran, PrismaClient, Prioritas, StatusDokumen, StatusPica, StatusTugas, TingkatTeguran } from '@prisma/client';
import { HARI, bulanRomawi, hariKerja, mingguIso, tanggalDb, ymd } from '../lib/waktu';
import { hitungPoin } from '../lib/logic/aturan';

const db = new PrismaClient();
const DIR = path.join(process.cwd(), 'storage', 'uploads');
const NOW = Date.now();

/** Waktu `hari` dari sekarang pada jam tertentu (WIB). */
function t(hari: number, jam = 9): Date {
  const tgl = ymd(new Date(NOW + hari * HARI));
  return new Date(`${tgl}T${String(jam).padStart(2, '0')}:00:00+07:00`);
}
const tgl = (hari: number) => tanggalDb(ymd(new Date(NOW + hari * HARI)));

/** PDF satu halaman sebagai contoh dokumen PO untuk SPK di data demo. */
async function tulisContohPo() {
  const teks = 'BT /F1 18 Tf 72 760 Td (Contoh dokumen Purchase Order) Tj 0 -28 Td /F1 11 Tf (Data demo Sistem Perintah Kerja) Tj ET';
  const obj = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${teks.length} >>\nstream\n${teks}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const off: number[] = [];
  obj.forEach((o, i) => { off.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n${off.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${obj.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, 'contoh__PO.pdf'), pdf);
}

async function main() {
  // Kosongkan dari tabel anak ke induk.
  await db.$transaction([
    db.notifikasi.deleteMany(), db.teguran.deleteMany(), db.reward.deleteMany(), db.evaluasi.deleteMany(),
    db.laporanAkhir.deleteMany(), db.pica.deleteMany(), db.laporanMingguan.deleteMany(), db.laporanHarian.deleteMany(),
    db.actionPlan.deleteMany(), db.pertanyaan.deleteMany(), db.penugasan.deleteMany(), db.riwayatPengesahan.deleteMany(),
    db.langkah.deleteMany(), db.perintahKerja.deleteMany(), db.user.deleteMany(), db.divisi.deleteMany(),
  ]);

  await tulisContohPo();

  const pms = await db.divisi.create({ data: { kode: 'PMS', nama: 'Pemasaran' } });
  const keu = await db.divisi.create({ data: { kode: 'KEU', nama: 'Keuangan' } });

  const hash = await bcrypt.hash('demo123', 10);
  const u = async (username: string, nama: string, peran: Peran, jabatan: string, divisiId: number | null, batasTugasAktif = 3) =>
    db.user.create({ data: { username, nama, peran, jabatan, divisiId, batasTugasAktif, passwordHash: hash } });

  await u('admin', 'Admin Sistem', Peran.admin, 'Administrator Sistem', null);
  const hendra = await u('hendra', 'Hendra Wijaya', Peran.manager, 'Manager Pemasaran', pms.id);
  const lestari = await u('lestari', 'Lestari Ayu', Peran.manager, 'Manager Keuangan', keu.id);
  const budi = await u('budi', 'Budi Santoso', Peran.spv, 'Supervisor Pemasaran', pms.id);
  const siti = await u('siti', 'Siti Rahmawati', Peran.spv, 'Supervisor Keuangan', keu.id);
  const andi = await u('andi', 'Andi Pratama', Peran.staff, 'Staff Digital Marketing', pms.id, 3);
  const dewi = await u('dewi', 'Dewi Lestari', Peran.staff, 'Staff Riset Pasar', pms.id, 2);
  const rina = await u('rina', 'Rina Marlina', Peran.staff, 'Staff Sales Support', pms.id, 3);
  const joko = await u('joko', 'Joko Susilo', Peran.staff, 'Staff Akuntansi', keu.id, 3);
  const maya = await u('maya', 'Maya Sari', Peran.staff, 'Staff Pajak', keu.id, 3);
  await u('fajar', 'Fajar Nugroho', Peran.staff, 'Staff Keuangan', keu.id, 3);

  const urut: Record<string, number> = {};
  type Opsi = {
    jenis: JenisPerintah; judul: string; apa: string; mengapa: string; diMana: string; bagaimana: string;
    prioritas: Prioritas; tenggat: Date; status: StatusDokumen; spv: typeof budi; manager: typeof hendra; divisi: typeof pms;
    dibuat: number; langkah: string[]; po?: { noPo: string; tglPo: Date; klien: string; nilaiPo: string }; alasanTolak?: string;
  };

  async function perintah(o: Opsi) {
    const sah = o.status === StatusDokumen.DISAHKAN || o.status === StatusDokumen.DITURUNKAN;
    const disahkanPada = sah ? t(o.dibuat + 1, 10) : null;
    let nomor: string | null = null;
    if (disahkanPada) {
      const k = `${o.jenis}-${o.divisi.kode}`;
      urut[k] = (urut[k] ?? 0) + 1;
      nomor = `${o.jenis}/${String(urut[k]).padStart(3, '0')}/${o.divisi.kode}/${bulanRomawi(disahkanPada)}/${ymd(disahkanPada).slice(0, 4)}`;
    }
    const pr = await db.perintahKerja.create({
      data: {
        jenis: o.jenis, judul: o.judul, apa: o.apa, mengapa: o.mengapa, diMana: o.diMana, bagaimana: o.bagaimana,
        prioritas: o.prioritas, tenggat: o.tenggat, status: o.status, spvId: o.spv.id, divisiId: o.divisi.id, nomor,
        managerId: o.status === StatusDokumen.DRAF || o.status === StatusDokumen.MENUNGGU_PENGESAHAN ? null : o.manager.id,
        diajukanPada: o.status === StatusDokumen.DRAF ? null : t(o.dibuat, 14),
        disahkanPada, alasanTolak: o.alasanTolak ?? null,
        ...(o.po ? { ...o.po, lampiranPo: 'contoh__PO.pdf' } : {}),
        createdAt: t(o.dibuat, 8),
        langkah: { create: o.langkah.map((deskripsi, i) => ({ urutan: i + 1, deskripsi })) },
      },
    });
    const riwayat: { aksi: AksiPengesahan; olehId: number; catatan?: string; dibuatPada: Date }[] = [];
    if (o.status !== StatusDokumen.DRAF) riwayat.push({ aksi: AksiPengesahan.DIAJUKAN, olehId: o.spv.id, dibuatPada: t(o.dibuat, 14) });
    if (o.status === StatusDokumen.DITOLAK) riwayat.push({ aksi: AksiPengesahan.DITOLAK, olehId: o.manager.id, catatan: o.alasanTolak, dibuatPada: t(o.dibuat + 1, 10) });
    if (sah) riwayat.push({ aksi: AksiPengesahan.DISAHKAN, olehId: o.manager.id, dibuatPada: disahkanPada! });
    await db.riwayatPengesahan.createMany({ data: riwayat.map(r => ({ ...r, perintahId: pr.id })) });
    return pr;
  }

  type Tugas = {
    staff: typeof andi; status: StatusTugas; diterima?: number; apSelesai?: number; harianLewati?: number[];
    harianSampai?: number; terlambat?: boolean; laporanAkhir?: number; evaluasi?: [number, number, number, Keputusan, string?];
  };

  async function turunkan(pr: Awaited<ReturnType<typeof perintah>>, turun: number, tugas: Tugas[]) {
    await db.riwayatPengesahan.create({
      data: { perintahId: pr.id, olehId: pr.spvId, aksi: AksiPengesahan.DITURUNKAN, catatan: tugas.map(x => x.staff.nama).join(', '), dibuatPada: t(turun, 11) },
    });
    const langkah = await db.langkah.findMany({ where: { perintahId: pr.id }, orderBy: { urutan: 'asc' } });
    const hasil = [];
    for (const x of tugas) {
      const diterimaPada = x.diterima != null ? t(x.diterima, 13) : null;
      const dilaporkanPada = x.laporanAkhir != null ? t(x.laporanAkhir, 16) : null;
      const p = await db.penugasan.create({
        data: {
          perintahId: pr.id, staffId: x.staff.id, status: x.status, terlambat: !!x.terlambat,
          diterimaPada, dilaporkanPada, dibuatPada: t(turun, 11),
        },
      });
      // Target AP disebar rata antara tanggal diterima dan tenggat.
      const mulai = x.diterima ?? turun;
      const akhir = Math.round((pr.tenggat.getTime() - NOW) / HARI);
      const ap = [];
      for (const [i, l] of langkah.entries()) {
        const target = Math.round(mulai + ((akhir - mulai) * (i + 1)) / langkah.length);
        const selesai = i < (x.apSelesai ?? 0);
        ap.push(await db.actionPlan.create({
          data: { penugasanId: p.id, urutan: l.urutan, kegiatan: l.deskripsi, targetTanggal: tgl(target), selesai, selesaiPada: selesai ? t(Math.min(target, -1), 15) : null },
        }));
      }
      // Laporan harian tiap hari kerja dari diterima sampai kemarin/laporan akhir, kecuali yang dilewati.
      if (x.diterima != null && x.harianSampai != null) {
        const hari = hariKerja(ymd(t(x.diterima)), ymd(t(x.harianSampai)));
        const lewati = new Set((x.harianLewati ?? []).map(i => hari[i]));
        const selesaiAp = ap.filter(a => a.selesai);
        let n = 0;
        for (const [i, h] of hari.entries()) {
          if (lewati.has(h)) continue;
          const apIni = ap[Math.min(Math.floor((i / hari.length) * ap.length), ap.length - 1)];
          n++;
          await db.laporanHarian.create({
            data: {
              penugasanId: p.id, tanggal: tanggalDb(h), actionPlanId: apIni.id,
              kegiatan: `Mengerjakan: ${apIni.kegiatan.toLowerCase()}.`,
              progres: Math.round((Math.min(selesaiAp.length, Math.ceil((n / hari.length) * selesaiAp.length)) / ap.length) * 100),
              dibuatPada: new Date(`${h}T16:30:00+07:00`),
            },
          });
        }
      }
      if (x.laporanAkhir != null) {
        await db.laporanAkhir.create({
          data: { penugasanId: p.id, hasil: 'Seluruh Action Plan selesai; hasil terlampir sesuai standar pada perintah.', dikirimPada: dilaporkanPada! },
        });
      }
      if (x.evaluasi) {
        const [w, k, s, keputusan, umpan] = x.evaluasi;
        await db.evaluasi.create({ data: { penugasanId: p.id, skorWaktu: w, skorKualitas: k, skorKesesuaian: s, keputusan, umpanBalik: umpan ?? null, dibuatPada: t(x.laporanAkhir! + 1, 10) } });
        if (keputusan === Keputusan.setujui) {
          const tepat = dilaporkanPada! <= pr.tenggat;
          const poin = hitungPoin((w + k + s) / 3, tepat);
          await db.reward.create({
            data: {
              penerimaId: x.staff.id, pemberiId: pr.spvId, penugasanId: p.id, jenis: 'otomatis', poin,
              pesan: `Poin evaluasi "${pr.judul}"${tepat ? ' (termasuk bonus tepat waktu)' : ''}`, dibuatPada: t(x.laporanAkhir! + 1, 10),
            },
          });
        }
      }
      hasil.push(p);
    }
    return hasil;
  }

  // ---------- Pemasaran ----------
  const spkKampanye = await perintah({
    jenis: JenisPerintah.SPK, judul: 'Kampanye digital peluncuran produk untuk PT Sinar Jaya', prioritas: Prioritas.TINGGI,
    apa: 'Menyiapkan dan menjalankan kampanye iklan digital (Instagram & Google Ads) untuk peluncuran produk baru klien.',
    mengapa: 'Memenuhi PO klien: target 5.000 leads selama periode kampanye.',
    diMana: 'Kantor Pemasaran lantai 3; koordinasi dengan klien lewat rapat daring mingguan.',
    bagaimana: 'Materi disetujui klien sebelum tayang; laporan performa memakai template divisi.',
    tenggat: t(12, 17), status: StatusDokumen.DITURUNKAN, spv: budi, manager: hendra, divisi: pms, dibuat: -10,
    langkah: ['Susun brief kreatif dan jadwal tayang', 'Produksi materi visual dan copy iklan', 'Pasang dan optimasi iklan', 'Susun laporan performa kampanye'],
    po: { noPo: 'PO/SJ/2026/0412', tglPo: tgl(-12), klien: 'PT Sinar Jaya', nilaiPo: '45000000' },
  });
  const [tAndi, tDewiSpk] = await turunkan(spkKampanye, -8, [
    { staff: andi, status: StatusTugas.DIKERJAKAN, diterima: -8, apSelesai: 2, harianSampai: -1, harianLewati: [3] },
    { staff: dewi, status: StatusTugas.DIKERJAKAN, diterima: -7, apSelesai: 1, harianSampai: -1 },
  ]);
  // Laporan mingguan Andi: minggu lalu tanpa kendala, minggu ini dengan PICA terbuka.
  await db.laporanMingguan.create({
    data: { penugasanId: tAndi.id, minggu: mingguIso(ymd(t(-7))), ringkasan: 'Brief kreatif selesai dan disetujui klien.', adaKendala: false, tanggapanSpv: 'Bagus, lanjutkan produksi materi.', dibuatPada: t(-5, 16) },
  });
  if (mingguIso(ymd(t(-7))) !== mingguIso()) {
    await db.laporanMingguan.create({
      data: {
        penugasanId: tAndi.id, minggu: mingguIso(), ringkasan: 'Produksi materi selesai, pemasangan iklan tertunda.', adaKendala: true, dibuatPada: t(0, 8),
        pica: {
          create: {
            problem: 'Akun iklan klien belum memberi akses admin ke tim kita.',
            identifikasi: 'Proses persetujuan akses di pihak klien harus melalui bagian IT mereka.',
            correctiveAction: 'Minta PIC klien mengeskalasi ke IT; sementara siapkan materi dan targeting di draft.',
            pic: 'Andi Pratama', dueDate: tgl(2), status: StatusPica.OPEN,
          },
        },
      },
    });
  }
  await db.laporanMingguan.create({
    data: { penugasanId: tDewiSpk.id, minggu: mingguIso(ymd(t(-7))), ringkasan: 'Riset audiens untuk targeting iklan selesai.', adaKendala: false, dibuatPada: t(-5, 16) },
  });

  const ispkLeads = await perintah({
    jenis: JenisPerintah.ISPK, judul: 'Rekap data leads kuartal III', prioritas: Prioritas.SEDANG,
    apa: 'Merekap seluruh leads Juli–September dari CRM dan formulir pameran ke satu lembar kerja.',
    mengapa: 'Bahan evaluasi kanal pemasaran untuk rapat kuartal.', diMana: 'CRM perusahaan dan folder bersama divisi.',
    bagaimana: 'Tanpa duplikat; kolom sesuai template rekap; dikirim dalam format XLSX.',
    tenggat: t(3, 17), status: StatusDokumen.DITURUNKAN, spv: budi, manager: hendra, divisi: pms, dibuat: -9,
    langkah: ['Ekspor data leads dari CRM', 'Gabungkan dengan data pameran', 'Bersihkan duplikat dan validasi kontak'],
  });
  await turunkan(ispkLeads, -7, [
    { staff: dewi, status: StatusTugas.DILAPORKAN, diterima: -7, apSelesai: 3, harianSampai: -1, laporanAkhir: -1 },
  ]);

  const ispkKompetitor = await perintah({
    jenis: JenisPerintah.ISPK, judul: 'Laporan analisis kompetitor bulan lalu', prioritas: Prioritas.SEDANG,
    apa: 'Menyusun analisis harga dan promo 3 kompetitor utama.', mengapa: 'Dasar penentuan promo bulan berjalan.',
    diMana: 'Riset daring dan kunjungan ke 2 dealer kompetitor.', bagaimana: 'Maksimal 5 halaman, tabel perbandingan wajib ada.',
    tenggat: t(-14, 17), status: StatusDokumen.DITURUNKAN, spv: budi, manager: hendra, divisi: pms, dibuat: -26,
    langkah: ['Kumpulkan data harga dan promo', 'Kunjungi dealer kompetitor', 'Susun laporan analisis'],
  });
  await turunkan(ispkKompetitor, -24, [
    { staff: andi, status: StatusTugas.DISETUJUI, diterima: -24, apSelesai: 3, harianSampai: -15, laporanAkhir: -15, evaluasi: [5, 4, 5, Keputusan.setujui] },
    { staff: rina, status: StatusTugas.DISETUJUI, diterima: -23, apSelesai: 3, harianSampai: -12, harianLewati: [2, 5], laporanAkhir: -12, terlambat: true, evaluasi: [2, 3, 3, Keputusan.setujui, 'Terlambat 2 hari; tabel perbandingan kurang lengkap.'] },
  ]);

  const ispkKatalog = await perintah({
    jenis: JenisPerintah.ISPK, judul: 'Pembaruan katalog produk untuk tim sales', prioritas: Prioritas.TINGGI,
    apa: 'Memperbarui katalog PDF dengan harga dan spesifikasi terbaru.', mengapa: 'Katalog lama memuat harga yang sudah tidak berlaku.',
    diMana: 'Folder bersama divisi; koordinasi dengan bagian produk.', bagaimana: 'Sesuai panduan merek; diperiksa ulang oleh SPV sebelum dibagikan.',
    tenggat: t(-2, 17), status: StatusDokumen.DITURUNKAN, spv: budi, manager: hendra, divisi: pms, dibuat: -12,
    langkah: ['Kumpulkan harga dan spesifikasi terbaru', 'Perbarui tata letak katalog', 'Kirim untuk diperiksa'],
  });
  await turunkan(ispkKatalog, -10, [
    { staff: rina, status: StatusTugas.DIKERJAKAN, diterima: -10, apSelesai: 1, harianSampai: -1, harianLewati: [1, 3, 4, 6], terlambat: true },
  ]);

  const ispkRiset = await perintah({
    jenis: JenisPerintah.ISPK, judul: 'Riset harga pasar untuk produk baru', prioritas: Prioritas.SEDANG,
    apa: 'Mengumpulkan harga 10 produk sejenis di marketplace dan toko resmi.', mengapa: 'Masukan penetapan harga peluncuran.',
    diMana: 'Marketplace daring dan 3 toko resmi di Jakarta.', bagaimana: 'Tabel harga dengan sumber dan tanggal pengambilan.',
    tenggat: t(9, 17), status: StatusDokumen.DITURUNKAN, spv: budi, manager: hendra, divisi: pms, dibuat: -3,
    langkah: ['Tentukan daftar produk pembanding', 'Kumpulkan harga dari setiap sumber', 'Susun tabel dan ringkasan'],
  });
  const [, tAndiRiset] = await turunkan(ispkRiset, -1, [
    { staff: dewi, status: StatusTugas.MENUNGGU_RESPON },
    { staff: andi, status: StatusTugas.MENUNGGU_JAWABAN },
  ]);
  await db.pertanyaan.create({ data: { penugasanId: tAndiRiset.id, isi: 'Apakah harga diskon flash sale ikut dicatat atau hanya harga normal?', ditanyaPada: t(0, 8) } });

  await perintah({
    jenis: JenisPerintah.ISPK, judul: 'Penyusunan materi pelatihan sales baru', prioritas: Prioritas.SEDANG,
    apa: 'Menyusun modul pelatihan produk untuk 8 sales baru.', mengapa: 'Mempercepat masa adaptasi sales baru.',
    diMana: 'Ruang pelatihan lantai 2.', bagaimana: 'Modul 20–30 slide disertai kuis pemahaman.',
    tenggat: t(14, 17), status: StatusDokumen.MENUNGGU_PENGESAHAN, spv: budi, manager: hendra, divisi: pms, dibuat: -1,
    langkah: ['Kumpulkan materi produk', 'Susun slide modul', 'Buat kuis pemahaman'],
  });
  await perintah({
    jenis: JenisPerintah.SPK, judul: 'Pameran produk di dealer CV Maju Motor', prioritas: Prioritas.TINGGI,
    apa: 'Menyiapkan booth dan materi promosi pameran 3 hari di dealer klien.', mengapa: 'Memenuhi PO klien untuk aktivasi penjualan akhir tahun.',
    diMana: 'Dealer CV Maju Motor, Bekasi.', bagaimana: 'Booth sesuai denah klien; laporan pengunjung harian.',
    tenggat: t(20, 17), status: StatusDokumen.DITOLAK, spv: budi, manager: hendra, divisi: pms, dibuat: -4,
    langkah: ['Survei lokasi', 'Produksi booth dan materi', 'Pelaksanaan pameran'],
    po: { noPo: 'PO/MM/2026/118', tglPo: tgl(-6), klien: 'CV Maju Motor', nilaiPo: '28500000' },
    alasanTolak: 'Nilai PO pada form berbeda dengan dokumen PO terlampir (Rp 25.800.000). Mohon disesuaikan dan lampirkan PO versi final.',
  });
  await perintah({
    jenis: JenisPerintah.ISPK, judul: 'Survei kepuasan pelanggan semester II', prioritas: Prioritas.RENDAH,
    apa: 'Menyebarkan dan merekap survei kepuasan ke 200 pelanggan.', mengapa: 'Indikator mutu layanan tahunan.',
    diMana: 'Survei daring melalui email pelanggan.', bagaimana: 'Minimal 60 responden; rekap dalam grafik.',
    tenggat: t(25, 17), status: StatusDokumen.DISAHKAN, spv: budi, manager: hendra, divisi: pms, dibuat: -2,
    langkah: ['Susun kuesioner', 'Sebarkan survei', 'Rekap dan analisis hasil'],
  });
  await perintah({
    jenis: JenisPerintah.ISPK, judul: 'Rencana konten media sosial bulan depan', prioritas: Prioritas.RENDAH,
    apa: 'Kalender konten 20 unggahan untuk Instagram dan LinkedIn.', mengapa: 'Menjaga konsistensi unggahan.',
    diMana: 'Kantor Pemasaran.', bagaimana: 'Format kalender divisi; setiap unggahan memiliki tujuan dan CTA.',
    tenggat: t(18, 17), status: StatusDokumen.DRAF, spv: budi, manager: hendra, divisi: pms, dibuat: 0,
    langkah: ['Tentukan tema mingguan', 'Susun kalender konten'],
  });

  // ---------- Keuangan ----------
  const spkAudit = await perintah({
    jenis: JenisPerintah.SPK, judul: 'Verifikasi tagihan proyek PT Global Teknik', prioritas: Prioritas.TINGGI,
    apa: 'Memverifikasi 42 tagihan termin proyek terhadap PO dan berita acara.', mengapa: 'Syarat pencairan termin ketiga dari klien.',
    diMana: 'Ruang arsip Keuangan dan sistem ERP.', bagaimana: 'Setiap tagihan dicocokkan dengan PO; selisih dicatat di kertas kerja.',
    tenggat: t(6, 17), status: StatusDokumen.DITURUNKAN, spv: siti, manager: lestari, divisi: keu, dibuat: -6,
    langkah: ['Kumpulkan tagihan dan berita acara', 'Cocokkan dengan PO', 'Susun kertas kerja selisih'],
    po: { noPo: 'PO/GT/2026/077', tglPo: tgl(-30), klien: 'PT Global Teknik', nilaiPo: '120000000' },
  });
  await turunkan(spkAudit, -4, [{ staff: joko, status: StatusTugas.DIKERJAKAN, diterima: -4, apSelesai: 1, harianSampai: -1 }]);

  const ispkPajak = await perintah({
    jenis: JenisPerintah.ISPK, judul: 'Rekap PPN masukan bulan lalu', prioritas: Prioritas.SEDANG,
    apa: 'Merekap faktur PPN masukan untuk pelaporan SPT Masa.', mengapa: 'Batas lapor SPT Masa PPN.',
    diMana: 'Sistem e-Faktur dan arsip faktur.', bagaimana: 'Rekap sesuai format e-Faktur, tanpa selisih.',
    tenggat: t(-6, 17), status: StatusDokumen.DITURUNKAN, spv: siti, manager: lestari, divisi: keu, dibuat: -16,
    langkah: ['Unduh daftar faktur', 'Cocokkan dengan arsip', 'Susun rekap'],
  });
  await turunkan(ispkPajak, -14, [
    { staff: maya, status: StatusTugas.DISETUJUI, diterima: -14, apSelesai: 3, harianSampai: -7, laporanAkhir: -7, evaluasi: [5, 5, 4, Keputusan.setujui] },
  ]);
  await perintah({
    jenis: JenisPerintah.ISPK, judul: 'Rekonsiliasi kas kecil bulan berjalan', prioritas: Prioritas.SEDANG,
    apa: 'Rekonsiliasi kas kecil seluruh divisi.', mengapa: 'Tutup buku bulanan.', diMana: 'Ruang Keuangan.',
    bagaimana: 'Selisih di atas Rp 50.000 dijelaskan.', tenggat: t(8, 17), status: StatusDokumen.MENUNGGU_PENGESAHAN,
    spv: siti, manager: lestari, divisi: keu, dibuat: 0, langkah: ['Kumpulkan bukti kas', 'Hitung dan cocokkan saldo'],
  });

  // Reward manual dan satu teguran lama sebagai contoh riwayat.
  await db.reward.create({ data: { penerimaId: andi.id, pemberiId: budi.id, jenis: 'pujian', poin: 10, pesan: 'Inisiatif bagus menyiapkan materi cadangan saat akses iklan tertunda.', dibuatPada: t(-2, 15) } });
  await db.reward.create({ data: { penerimaId: maya.id, pemberiId: siti.id, jenis: 'sertifikat', poin: 0, pesan: 'Karyawan Teladan bulan lalu.', dibuatPada: t(-5, 15) } });
  await db.teguran.create({
    data: { penerimaId: rina.id, pemberiId: budi.id, tingkat: TingkatTeguran.Lisan, alasan: 'Terlambat menyerahkan laporan kunjungan.', catatanPembinaan: 'Gunakan AP harian untuk memecah pekerjaan.', dibacaPada: t(-39, 10), dibuatPada: t(-40, 10) },
  });

  // Notifikasi awal agar lonceng tidak kosong.
  await db.notifikasi.createMany({
    data: [
      { userId: hendra.id, pesan: `${budi.nama} mengajukan ISPK "Penyusunan materi pelatihan sales baru" untuk disahkan`, tautan: '/manager', dibuatPada: t(-1, 14) },
      { userId: budi.id, pesan: `${andi.nama} bertanya tentang "Riset harga pasar untuk produk baru"`, tautan: `/spv/penugasan/${tAndiRiset.id}`, dibuatPada: t(0, 8) },
      { userId: budi.id, pesan: `${andi.nama} melaporkan kendala (PICA) di "${spkKampanye.judul}"`, tautan: `/spv/penugasan/${tAndi.id}`, dibuatPada: t(0, 8) },
      { userId: dewi.id, pesan: `Perintah kerja baru: "Riset harga pasar untuk produk baru"`, tautan: '/staff', dibuatPada: t(-1, 11) },
      { userId: lestari.id, pesan: `${siti.nama} mengajukan ISPK "Rekonsiliasi kas kecil bulan berjalan" untuk disahkan`, tautan: '/manager', dibuatPada: t(0, 14) },
    ],
  });

  console.log('Seed selesai. Semua akun demo memakai password: demo123');
}

main().finally(() => db.$disconnect());
