// Data demo SPK Eksternal Direktorat 3: order di setiap tahap RFQ → BAST, termasuk contoh
// lewat SLA, jadwal pengajar yang bentrok, dan PP yang diajukan kurang dari 14 hari.
// Semua tanggal relatif terhadap saat seed dijalankan.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import {
  JenisCustomer, JenisFasilitas, JenisLayanan, JenisPo, Peran, PrismaClient, StatusOrder, StatusPengajar, StatusPp, StatusQuotation,
} from '@prisma/client';
import { LAYANAN, type Detail } from '../lib/layanan';
import { TAHAP } from '../lib/logic/aturan';
import { HARI, bulanRomawi, tanggalDb, ymd } from '../lib/waktu';

const db = new PrismaClient();
const NOW = Date.now();
const DIR = path.join(process.cwd(), 'storage', 'uploads');

/** Waktu `hari` dari sekarang pada jam tertentu (WIB). */
function t(hari: number, jam = 9): Date {
  return new Date(`${ymd(new Date(NOW + hari * HARI))}T${String(jam).padStart(2, '0')}:00:00+07:00`);
}
const tgl = (hari: number) => tanggalDb(ymd(new Date(NOW + hari * HARI)));

const urut: Record<string, number> = {};
function nomor(awal: string, tengah: string, saat: Date) {
  const tahun = ymd(saat).slice(0, 4);
  const k = `${awal}/${tahun}`;
  urut[k] = (urut[k] ?? 0) + 1;
  return `${awal}/${String(urut[k]).padStart(3, '0')}/${tengah}${tengah ? '/' : ''}${bulanRomawi(saat)}/${tahun}`;
}

/** PDF satu halaman sebagai contoh lampiran (PO, silabus, laporan). */
async function tulisPdf(nama: string, judul: string) {
  const isi = `BT /F1 18 Tf 72 760 Td (${judul}) Tj 0 -28 Td /F1 11 Tf (Contoh dokumen - data demo Sistem SPK Direktorat 3) Tj ET`;
  const obj = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${isi.length} >>\nstream\n${isi}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const off: number[] = [];
  obj.forEach((o, i) => { off.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n${off.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${obj.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  await writeFile(path.join(DIR, nama), pdf);
}

async function main() {
  await db.$transaction([
    db.notifikasi.deleteMany(), db.bast.deleteMany(), db.laporanKegiatan.deleteMany(), db.bookingFasilitas.deleteMany(),
    db.purchaseRequest.deleteMany(), db.penugasanPengajar.deleteMany(), db.jadwalLog.deleteMany(), db.spk.deleteMany(),
    db.purchaseOrder.deleteMany(), db.quotation.deleteMany(), db.rakItem.deleteMany(), db.silabus.deleteMany(),
    db.riwayatOrder.deleteMany(), db.order.deleteMany(), db.fasilitas.deleteMany(), db.sla.deleteMany(),
    db.customer.deleteMany(), db.user.deleteMany(), db.unit.deleteMany(),
  ]);
  await mkdir(DIR, { recursive: true });
  await Promise.all([
    tulisPdf('contoh__PO.pdf', 'Purchase Order'),
    tulisPdf('contoh__Silabus.pdf', 'Silabus / RPS'),
    tulisPdf('contoh__Laporan.pdf', 'Laporan Kegiatan'),
  ]);

  // ---------- Master ----------
  const inf = await db.unit.create({ data: { kode: 'INF', nama: 'UPT Informatika' } });
  const mkt = await db.unit.create({ data: { kode: 'MKA', nama: 'UPT Mekatronika' } });
  await db.unit.create({ data: { kode: 'TPM', nama: 'Prodi Teknik Produksi' } });

  const hash = await bcrypt.hash('demo123', 10);
  const u = (username: string, nama: string, peran: Peran, jabatan: string, unitId: number | null = null, eksternal = false) =>
    db.user.create({ data: { username, nama, peran, jabatan, unitId, eksternal, passwordHash: hash } });
  const admin = await u('admin', 'Admin Sistem', Peran.admin, 'Administrator Sistem');
  const sinta = await u('marketing', 'Sinta Maharani', Peran.marketing, 'Marketing Training, Konsultasi & Sertifikasi');
  const kadepMkt = await u('kadepmkt', 'Yudi Hartono', Peran.kadep_marketing, 'Kepala Departemen Marketing');
  const dps = await u('dps', 'Lina Kartika', Peran.dps, 'Staf Departemen Pelatihan & Sertifikasi');
  const kadepDps = await u('kadepdps', 'Agus Salim', Peran.kadep_dps, 'Kepala Departemen DPS');
  const uptInf = await u('upt.inf', 'Dimas Prakoso', Peran.upt, 'Kepala UPT Informatika', inf.id);
  const uptMkt = await u('upt.mka', 'Ratna Sari', Peran.upt, 'Kepala UPT Mekatronika', mkt.id);
  const rudi = await u('rudi', 'Rudi Hermawan', Peran.pengajar, 'Dosen Informatika', inf.id);
  const ayu = await u('ayu', 'Ayu Lestari', Peran.pengajar, 'Dosen Informatika', inf.id);
  const bayu = await u('bayu', 'Bayu Saputra', Peran.pengajar, 'Dosen Mekatronika', mkt.id);
  const hendro = await u('hendro', 'Hendro Wibowo', Peran.pengajar, 'Konsultan Lean Manufacturing', null, true);
  void admin;

  const c = (nama: string, jenis: JenisCustomer, pic: string, telepon: string) => db.customer.create({ data: { nama, jenis, pic, telepon, email: `${pic.split(' ')[0].toLowerCase()}@contoh.co.id` } });
  const otoparts = await c('PT Astra Otoparts Tbk', JenisCustomer.SWASTA, 'Bambang Irawan', '021-4603550');
  const pertamina = await c('PT Pertamina (Persero)', JenisCustomer.BUMN, 'Desi Anggraini', '021-3815111');
  const telkom = await c('PT Telkom Indonesia', JenisCustomer.BUMN, 'Fikri Ramadhan', '021-5215111');
  const ut = await c('PT United Tractors Tbk', JenisCustomer.SWASTA, 'Wahyu Nugroho', '021-24579999');
  const univ = await c('Universitas Teknologi Nusantara', JenisCustomer.INSTITUSI, 'Dr. Maria Ulfa', '021-7270162');
  const sinar = await c('CV Sinar Abadi Teknik', JenisCustomer.SWASTA, 'Joko Santoso', '0812-1111-2222');

  const f = (nama: string, jenis: JenisFasilitas, kapasitas: number) => db.fasilitas.create({ data: { nama, jenis, kapasitas } });
  const labIot = await f('Lab IoT & Embedded', JenisFasilitas.LABORATORIUM, 25);
  const labPlc = await f('Lab PLC & Otomasi', JenisFasilitas.LABORATORIUM, 20);
  const kelas = await f('Ruang Kelas 3.01', JenisFasilitas.RUANG_KELAS, 40);
  await f('Aula Astratek', JenisFasilitas.AULA, 150);

  // ---------- Pembangun order ----------
  type Opsi = {
    customer: { id: number }; jenis: JenisLayanan; judul: string; deskripsi: string; detail: Detail;
    mulai: number; lama: number; lokasi: string; peserta?: number; sampai: StatusOrder;
    /** Hari (relatif sekarang) order dicatat; tiap tahap berikutnya berselang `jeda` hari. */
    dibuat: number; jeda?: number; tahapMulai?: number; unit?: { id: number };
    rak?: [string, number, string, number][]; margin?: number; pengajar?: { id: number }[];
  };

  async function order(o: Opsi) {
    const target = TAHAP.indexOf(o.sampai === StatusOrder.DITOLAK ? StatusOrder.RFQ : o.sampai === StatusOrder.BATAL ? StatusOrder.QUOTATION : o.sampai);
    const lewat = (s: StatusOrder) => TAHAP.indexOf(s) <= target;
    const jeda = o.jeda ?? 1;
    // Waktu masuk tiap tahap normal.
    const masuk = (s: StatusOrder) => t(Math.min(o.dibuat + TAHAP.indexOf(s) * jeda, 0), 10 + (TAHAP.indexOf(s) % 6));
    const tahapMulai = o.tahapMulai != null ? t(o.tahapMulai, 10) : masuk(TAHAP[target]);
    const dibuat = t(o.dibuat, 9);
    const rec = await db.order.create({
      data: {
        nomorRfq: nomor('RFQ', 'D3', dibuat), customerId: o.customer.id, marketingId: sinta.id, jenis: o.jenis, judul: o.judul,
        deskripsi: o.deskripsi, tglMulai: tgl(o.mulai), tglSelesai: tgl(o.mulai + o.lama - 1), lokasi: o.lokasi,
        jumlahPeserta: o.peserta ?? null, detail: o.detail, status: o.sampai, tahapMulai, unitId: o.unit?.id ?? null, createdAt: dibuat,
        alasanTutup: o.sampai === StatusOrder.DITOLAK ? 'Belum ada instruktur bersertifikat untuk skema ini.' : o.sampai === StatusOrder.BATAL ? 'Customer memilih penyedia lain karena anggaran.' : null,
      },
    });
    const riwayat: { olehId: number; dari: StatusOrder | null; ke: StatusOrder; catatan: string; dibuatPada: Date }[] = [
      { olehId: sinta.id, dari: null, ke: StatusOrder.RFQ, catatan: 'RFQ dicatat', dibuatPada: dibuat },
    ];
    const pindah = (dari: StatusOrder, ke: StatusOrder, olehId: number, catatan: string) =>
      riwayat.push({ olehId, dari, ke, catatan, dibuatPada: o.tahapMulai != null && ke === o.sampai ? tahapMulai : masuk(ke) });

    if (o.sampai === StatusOrder.DITOLAK) pindah(StatusOrder.RFQ, StatusOrder.DITOLAK, sinta.id, rec.alasanTutup!);
    const uptUser = o.unit?.id === mkt.id ? uptMkt : uptInf;

    if (lewat(StatusOrder.SILABUS_RAK) && o.sampai !== StatusOrder.DITOLAK) {
      pindah(StatusOrder.RFQ, StatusOrder.SILABUS_RAK, sinta.id, 'Sanggup; request Silabus & RAK ke DPS');
      const kirim = lewat(StatusOrder.QUOTATION);
      const diteruskan = kirim || o.tahapMulai == null || o.tahapMulai < -1;
      await db.silabus.create({
        data: {
          orderId: rec.id, tenggat: tgl(Math.min(o.dibuat + jeda, 0) + 7),
          diteruskanPada: diteruskan ? t(Math.min(o.dibuat + jeda, 0), 14) : null,
          ringkasan: kirim ? `Silabus ${o.judul}: teori dasar, praktik terbimbing, studi kasus, dan evaluasi akhir.` : null,
          berkas: kirim ? 'contoh__Silabus.pdf' : null, dikirimPada: kirim ? masuk(StatusOrder.QUOTATION) : null,
        },
      });
      if (diteruskan) riwayat.push({ olehId: dps.id, dari: StatusOrder.SILABUS_RAK, ke: StatusOrder.SILABUS_RAK, catatan: `Diteruskan ke ${o.unit?.id === mkt.id ? mkt.nama : inf.nama}`, dibuatPada: t(Math.min(o.dibuat + jeda, 0), 14) });
      if (kirim) {
        await db.rakItem.createMany({ data: (o.rak ?? []).map(([uraian, volume, satuan, harga]) => ({ orderId: rec.id, uraian, volume, satuan, hargaSatuan: String(harga) })) });
        for (const p of o.pengajar ?? []) await db.penugasanPengajar.create({ data: { orderId: rec.id, pengajarId: p.id, peran: 'Instruktur', status: StatusPengajar.USULAN } });
        pindah(StatusOrder.SILABUS_RAK, StatusOrder.QUOTATION, uptUser.id, 'Silabus & RAK dikirim UPT');
      }
    }
    const rak = (o.rak ?? []).reduce((a, [, v, , h]) => a + v * h, 0);
    const nilai = Math.round(rak * (1 + (o.margin ?? 50) / 100));
    if (lewat(StatusOrder.QUOTATION) && rak) {
      const saat = new Date(masuk(StatusOrder.QUOTATION).getTime() + 3 * 3600_000);
      const q = nomor('Q', 'D3-MKT', saat);
      const st = o.sampai === StatusOrder.QUOTATION ? StatusQuotation.DIKIRIM : o.sampai === StatusOrder.BATAL ? StatusQuotation.DITOLAK : StatusQuotation.DISETUJUI;
      await db.quotation.create({ data: { orderId: rec.id, nomor: q, versi: 1, nilaiRak: String(rak), marginPersen: String(o.margin ?? 50), nilaiPenawaran: String(nilai), berlakuSampai: tgl(o.dibuat + 20), status: st, dibuatPada: saat } });
      riwayat.push({ olehId: sinta.id, dari: StatusOrder.QUOTATION, ke: StatusOrder.QUOTATION, catatan: `Quotation ${q} (v1) diterbitkan`, dibuatPada: saat });
      if (o.sampai === StatusOrder.BATAL) pindah(StatusOrder.QUOTATION, StatusOrder.BATAL, sinta.id, rec.alasanTutup!);
    }
    if (lewat(StatusOrder.SPK_DRAF) && o.sampai !== StatusOrder.BATAL) {
      const noPo = `PO/${o.customer.id}${rec.id}/2026`;
      await db.purchaseOrder.create({ data: { orderId: rec.id, jenis: JenisPo.PO, nomor: noPo, tanggal: tgl(Math.min(o.dibuat + 3 * jeda, 0)), nilai: String(nilai), lampiran: 'contoh__PO.pdf' } });
      pindah(StatusOrder.QUOTATION, StatusOrder.SPK_DRAF, sinta.id, `PO ${noPo} diterima`);
    }
    if (lewat(StatusOrder.APPROVAL_1) && o.sampai !== StatusOrder.BATAL) {
      const a1 = lewat(StatusOrder.APPROVAL_2) ? masuk(StatusOrder.APPROVAL_2) : null;
      const a2 = lewat(StatusOrder.PERSIAPAN) ? masuk(StatusOrder.PERSIAPAN) : null;
      await db.spk.create({
        data: {
          orderId: rec.id, ruangLingkup: `${LAYANAN[o.jenis].label}: ${o.judul}. ${o.deskripsi}`, budgetRak: String(rak), nilaiKontrak: String(nilai),
          approval1Id: a1 ? kadepMkt.id : null, approval1Pada: a1, approval2Id: a2 ? kadepDps.id : null, approval2Pada: a2,
          nomor: a2 ? nomor('SPK', `${LAYANAN[o.jenis].kode}/D3`, a2) : null, dibuatPada: masuk(StatusOrder.SPK_DRAF),
        },
      });
      pindah(StatusOrder.SPK_DRAF, StatusOrder.APPROVAL_1, sinta.id, 'SPK diajukan ke Kadep Marketing');
      if (a1) pindah(StatusOrder.APPROVAL_1, StatusOrder.APPROVAL_2, kadepMkt.id, 'Approval 1 disetujui');
      if (a2) pindah(StatusOrder.APPROVAL_2, StatusOrder.PERSIAPAN, kadepDps.id, 'SPK approved');
    }
    if (lewat(StatusOrder.PELAKSANAAN)) pindah(StatusOrder.PERSIAPAN, StatusOrder.PELAKSANAAN, dps.id, 'Program dimulai');
    if (lewat(StatusOrder.LAPORAN)) {
      await db.laporanKegiatan.create({ data: { orderId: rec.id, ringkasan: 'Program terlaksana sesuai SPK; seluruh sesi dan evaluasi akhir selesai.', jumlahHadir: o.peserta ?? null, lampiran: 'contoh__Laporan.pdf', dikirimPada: masuk(StatusOrder.LAPORAN) } });
      pindah(StatusOrder.PELAKSANAAN, StatusOrder.LAPORAN, dps.id, 'Laporan kegiatan DPS dikirim');
    }
    if (lewat(StatusOrder.SELESAI)) {
      const saat = masuk(StatusOrder.SELESAI);
      const b = nomor('BAST', 'D3', saat);
      await db.bast.create({ data: { orderId: rec.id, nomor: b, tanggal: tanggalDb(ymd(saat)), dibuatPada: saat } });
      pindah(StatusOrder.LAPORAN, StatusOrder.SELESAI, sinta.id, `BAST ${b} diterbitkan untuk penagihan`);
    }
    await db.riwayatOrder.createMany({ data: riwayat.map(r => ({ ...r, orderId: rec.id })) });
    return rec;
  }

  /** Penugasan pengajar yang sudah ditetapkan DPS (ditambah Surat Tugas bila bersedia). */
  async function tugaskan(orderId: number, pengajarId: number, status: StatusPengajar, suratTugas: boolean, hari: number) {
    const saat = t(hari, 13);
    await db.penugasanPengajar.upsert({
      where: { orderId_pengajarId: { orderId, pengajarId } },
      create: { orderId, pengajarId, peran: 'Instruktur', status, nomorSuratTugas: suratTugas ? nomor('ST', 'DPS', saat) : null, suratTugasPada: suratTugas ? saat : null },
      update: { status, nomorSuratTugas: suratTugas ? nomor('ST', 'DPS', saat) : null, suratTugasPada: suratTugas ? saat : null },
    });
  }

  const RAK_TRAINING: [string, number, string, number][] = [
    ['Honor instruktur', 3, 'hari', 1_500_000], ['Modul & sertifikat peserta', 20, 'peserta', 150_000],
    ['Konsumsi', 60, 'porsi', 50_000], ['Bahan praktik', 1, 'paket', 1_000_000],
  ];

  // 1. RFQ baru masuk
  await order({ customer: telkom, jenis: JenisLayanan.TRAINING, judul: 'Training Python untuk Data Analyst', deskripsi: 'Pelatihan Python & pandas untuk 20 analis data.', detail: { paxRate: '3500000', tempat: 'Astratek' }, mulai: 40, lama: 3, lokasi: 'Kampus Astratek', peserta: 20, sampai: StatusOrder.RFQ, dibuat: -1 });
  // 2. RFQ lewat SLA analisis
  await order({ customer: otoparts, jenis: JenisLayanan.KONSULTASI, judul: 'Konsultasi Lean Manufacturing Line Assembly', deskripsi: 'Pendampingan penurunan waste di line assembly.', detail: { lingkup: 'Pemetaan VSM dan rekomendasi perbaikan line assembly A.', metode: 'Gemba / Field Visit', milestone: 'Minggu 2: VSM current state; minggu 4: laporan solusi.', jadwalMonitoring: 'Setiap Jumat' }, mulai: 30, lama: 20, lokasi: 'Plant Astra Otoparts, Sunter', sampai: StatusOrder.RFQ, dibuat: -4 });
  // 3. Silabus & RAK menunggu DPS
  await order({ customer: pertamina, jenis: JenisLayanan.SERTIFIKASI, judul: 'Sertifikasi BNSP Junior Network Administrator', deskripsi: 'Uji kompetensi 15 teknisi jaringan.', detail: { skema: 'Junior Network Administrator', lembaga: 'LSP Politeknik Astra', nilaiPerPeserta: '2750000', syaratLulus: 'Lulus uji tulis dan praktik konfigurasi jaringan.' }, mulai: 35, lama: 2, lokasi: 'Kampus Astratek', peserta: 15, sampai: StatusOrder.SILABUS_RAK, dibuat: -2, tahapMulai: -1, unit: inf });
  // 4. Silabus & RAK di UPT, lewat SLA (masalah lead time > 1 minggu)
  await order({ customer: otoparts, jenis: JenisLayanan.TRAINING, judul: 'Training IoT untuk Maintenance Prediktif', deskripsi: 'Pelatihan sensor dan dashboard IoT untuk tim maintenance.', detail: { paxRate: '4200000', tempat: 'In-house (lokasi customer)' }, mulai: 28, lama: 3, lokasi: 'Plant Astra Otoparts, Sunter', peserta: 18, sampai: StatusOrder.SILABUS_RAK, dibuat: -10, tahapMulai: -9, unit: inf });
  // 5. Quotation terkirim (contoh RAK Rp10 jt → penawaran Rp30 jt)
  await order({ customer: ut, jenis: JenisLayanan.KOMBINASI, judul: 'Training + Sertifikasi Programmable Logic Controller', deskripsi: 'Paket pelatihan PLC dan uji sertifikasi untuk 12 teknisi.', detail: { modulTraining: 'PLC dasar, ladder diagram, troubleshooting.', paxRate: '2500000', skema: 'Teknisi Otomasi Industri', lembaga: 'LSP Politeknik Astra', nilaiPerPeserta: '1500000' }, mulai: 25, lama: 4, lokasi: 'Kampus Astratek', peserta: 12, sampai: StatusOrder.QUOTATION, dibuat: -6, unit: mkt, rak: [['Honor instruktur', 4, 'hari', 1_250_000], ['Biaya uji sertifikasi', 12, 'peserta', 250_000], ['Bahan praktik PLC', 1, 'paket', 2_000_000]], margin: 200, pengajar: [bayu] });
  // 6. Menunggu approval 1
  await order({ customer: univ, jenis: JenisLayanan.TRAINING, judul: 'Workshop Industri 4.0 untuk Dosen', deskripsi: 'Workshop 2 hari bagi 30 dosen teknik.', detail: { paxRate: '1800000', tempat: 'Astratek' }, mulai: 20, lama: 2, lokasi: 'Kampus Astratek', peserta: 30, sampai: StatusOrder.APPROVAL_1, dibuat: -8, unit: inf, rak: RAK_TRAINING, margin: 60, pengajar: [ayu] });
  // 7. Menunggu approval 2
  await order({ customer: sinar, jenis: JenisLayanan.SEWA_RUANG, judul: 'Sewa Lab PLC untuk Pelatihan Internal', deskripsi: 'Penyewaan lab PLC 2 hari untuk pelatihan internal customer.', detail: { ruangan: 'Lab PLC & Otomasi', durasi: '2 hari', fasilitasPendukung: '10 trainer kit PLC, proyektor' }, mulai: 18, lama: 2, lokasi: 'Lab PLC & Otomasi', peserta: 15, sampai: StatusOrder.APPROVAL_2, dibuat: -9, unit: mkt, rak: [['Sewa lab', 2, 'hari', 2_000_000], ['Teknisi pendamping', 2, 'hari', 500_000]], margin: 40 });
  // 8. Persiapan: pengajar, PP mepet, booking lab
  const iot = await order({ customer: otoparts, jenis: JenisLayanan.TRAINING, judul: 'Training Embedded System untuk Teknisi Produksi', deskripsi: 'Pelatihan mikrokontroler dan sensor untuk 20 teknisi.', detail: { paxRate: '3800000', tempat: 'Astratek' }, mulai: 10, lama: 3, lokasi: 'Kampus Astratek', peserta: 20, sampai: StatusOrder.PERSIAPAN, dibuat: -20, jeda: 2, unit: inf, rak: RAK_TRAINING, margin: 80, pengajar: [rudi, ayu] });
  await tugaskan(iot.id, rudi.id, StatusPengajar.BERSEDIA, true, -2);
  await tugaskan(iot.id, ayu.id, StatusPengajar.MENUNGGU, false, -1);
  await db.purchaseRequest.create({ data: { orderId: iot.id, item: 'Sensor suhu DHT22', jumlah: 20, satuan: 'pcs', estimasiHarga: '45000', status: StatusPp.DIPROSES, dibuatPada: t(-1, 11) } });
  await db.purchaseRequest.create({ data: { orderId: iot.id, item: 'Modul relay 4 channel', jumlah: 20, satuan: 'pcs', estimasiHarga: '65000', status: StatusPp.DIAJUKAN, dibuatPada: t(0, 8) } });
  await db.bookingFasilitas.create({ data: { orderId: iot.id, fasilitasId: labIot.id, mulai: tgl(10), selesai: tgl(12) } });
  // 9. Persiapan dengan tanggal tumpang tindih: Rudi diusulkan UPT tetapi bentrok dengan order 8
  await order({ customer: telkom, jenis: JenisLayanan.TRAINING, judul: 'Training Cyber Security Awareness', deskripsi: 'Pelatihan keamanan siber dasar untuk 35 karyawan.', detail: { paxRate: '1500000', tempat: 'In-house (lokasi customer)' }, mulai: 11, lama: 2, lokasi: 'Telkom Landmark Tower, Jakarta', peserta: 35, sampai: StatusOrder.PERSIAPAN, dibuat: -16, jeda: 2, tahapMulai: -1, unit: inf, rak: RAK_TRAINING, margin: 50, pengajar: [rudi] });
  // 10. Sedang dilaksanakan
  const srt = await order({ customer: pertamina, jenis: JenisLayanan.SERTIFIKASI, judul: 'Sertifikasi Operator K3 Listrik', deskripsi: 'Uji kompetensi K3 listrik untuk 25 operator.', detail: { skema: 'Operator K3 Listrik', lembaga: 'Asosiasi K3 Indonesia', nilaiPerPeserta: '3200000', syaratLulus: 'Nilai uji tulis ≥ 70 dan lulus praktik.' }, mulai: -2, lama: 4, lokasi: 'Kampus Astratek', peserta: 25, sampai: StatusOrder.PELAKSANAAN, dibuat: -30, jeda: 3, unit: mkt, rak: [['Biaya asesor', 2, 'orang', 3_000_000], ['Biaya uji', 25, 'peserta', 1_200_000]], margin: 50, pengajar: [bayu] });
  await tugaskan(srt.id, bayu.id, StatusPengajar.BERSEDIA, true, -8);
  await db.bookingFasilitas.create({ data: { orderId: srt.id, fasilitasId: kelas.id, mulai: tgl(-2), selesai: tgl(1) } });
  // 11. Laporan masuk, menunggu BAST
  const kns = await order({ customer: ut, jenis: JenisLayanan.KONSULTASI, judul: 'Konsultasi Sistem Maintenance Berbasis TPM', deskripsi: 'Penyusunan sistem TPM untuk workshop alat berat.', detail: { lingkup: 'Audit TPM dan rancangan pilar autonomous maintenance.', metode: 'FGD', milestone: 'Laporan audit; rancangan sistem; sosialisasi.', jadwalMonitoring: 'Dua mingguan' }, mulai: -20, lama: 15, lokasi: 'Workshop United Tractors, Cakung', sampai: StatusOrder.LAPORAN, dibuat: -45, jeda: 4, tahapMulai: -2, unit: mkt, rak: [['Honor konsultan', 6, 'hari', 3_500_000], ['Transport & akomodasi', 1, 'paket', 4_000_000]], margin: 70, pengajar: [hendro] });
  await tugaskan(kns.id, hendro.id, StatusPengajar.BERSEDIA, true, -25);
  // 12. Selesai dengan BAST
  const kmb = await order({ customer: univ, jenis: JenisLayanan.KOMBINASI, judul: 'Training + Sertifikasi Desain CAD', deskripsi: 'Paket pelatihan dan sertifikasi CAD untuk 20 mahasiswa.', detail: { modulTraining: 'Gambar teknik, CAD 2D/3D.', paxRate: '2000000', skema: 'Drafter CAD', lembaga: 'LSP Politeknik Astra', nilaiPerPeserta: '1000000' }, mulai: -40, lama: 5, lokasi: 'Kampus Astratek', peserta: 20, sampai: StatusOrder.SELESAI, dibuat: -70, jeda: 6, unit: inf, rak: RAK_TRAINING, margin: 90, pengajar: [ayu] });
  await tugaskan(kmb.id, ayu.id, StatusPengajar.BERSEDIA, true, -45);
  await db.bookingFasilitas.create({ data: { orderId: kmb.id, fasilitasId: labPlc.id, mulai: tgl(-40), selesai: tgl(-36) } });
  // 13–14. Order tertutup
  await order({ customer: sinar, jenis: JenisLayanan.TRAINING, judul: 'Training Pneumatik Dasar', deskripsi: 'Pelatihan pneumatik untuk 10 teknisi.', detail: { paxRate: '2200000', tempat: 'Astratek' }, mulai: 15, lama: 2, lokasi: 'Kampus Astratek', peserta: 10, sampai: StatusOrder.BATAL, dibuat: -14, jeda: 2, unit: mkt, rak: RAK_TRAINING, margin: 50 });
  await order({ customer: telkom, jenis: JenisLayanan.SERTIFIKASI, judul: 'Sertifikasi Cloud Architect', deskripsi: 'Sertifikasi internasional cloud untuk 8 engineer.', detail: { skema: 'Cloud Architect', lembaga: 'Asosiasi Cloud Indonesia', nilaiPerPeserta: '6000000', syaratLulus: 'Lulus ujian daring.' }, mulai: 30, lama: 1, lokasi: 'Daring', peserta: 8, sampai: StatusOrder.DITOLAK, dibuat: -5 });

  // Notifikasi awal agar lonceng tidak kosong.
  await db.notifikasi.createMany({
    data: [
      { userId: kadepMkt.id, pesan: 'Approval 1 SPK: Workshop Industri 4.0 untuk Dosen', tautan: '/approval', dibuatPada: t(0, 8) },
      { userId: kadepDps.id, pesan: 'Approval 2 SPK: Sewa Lab PLC untuk Pelatihan Internal', tautan: '/approval', dibuatPada: t(0, 8) },
      { userId: ayu.id, pesan: 'Konfirmasi ketersediaan mengajar: Training Embedded System untuk Teknisi Produksi', tautan: '/pengajar', dibuatPada: t(-1, 13) },
      { userId: uptInf.id, pesan: 'Request Silabus & RAK: Training IoT untuk Maintenance Prediktif', tautan: '/upt', dibuatPada: t(-9, 14) },
    ],
  });

  console.log('Seed selesai. Semua akun demo memakai password: demo123');
}

main().finally(() => db.$disconnect());
