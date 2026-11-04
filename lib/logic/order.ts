import { JenisLayanan, Peran, StatusOrder, type Order } from '@prisma/client';
import { db } from '../db';
import { gagal, teks, wajib } from '../errors';
import { BUTUH_PESERTA, LAYANAN, type Detail } from '../layanan';
import { LIHAT_SEMUA } from '../peran';
import type { Pengguna } from '../session';
import { HARI, bulanRomawi, hariIni, tanggalDb, ymd } from '../waktu';
import { BOLEH_UBAH_JADWAL, SLA_DEFAULT, STATUS_TUTUP, notify, notifyBanyak, type Db } from './aturan';
import { customerValid, type DataCustomer } from './akun';
import { bentrokFasilitas } from './operasional';

export function wajibPeran(u: Pengguna, ...peran: Peran[]) {
  if (!peran.includes(u.peran)) gagal('Anda tidak memiliki akses untuk tindakan ini.');
}

/** Order yang boleh dilihat pengguna: peran pusat melihat semua, UPT hanya order unitnya. */
export async function orderTerlihat(u: Pengguna, id: number) {
  const o = await db.order.findUnique({ where: { id } });
  const boleh = !!o && (
    LIHAT_SEMUA.includes(u.peran)
    || (u.peran === Peran.upt && o.unitId === u.unitId)
  );
  if (!boleh) gagal('Order tidak ditemukan.');
  return o!;
}

/** Ambil order dan pastikan sedang berada di tahap tertentu. */
export async function orderDiTahap(id: number, ...status: StatusOrder[]) {
  const o = await db.order.findUnique({ where: { id } });
  if (!o) gagal('Order tidak ditemukan.');
  if (!status.includes(o.status)) gagal('Tindakan ini tidak sesuai dengan tahap order saat ini.');
  return o;
}

/** Pindah tahap + catat audit trail. SLA tahap baru dihitung dari saat ini. */
export async function pindahTahap(tx: Db, o: Pick<Order, 'id' | 'status'>, ke: StatusOrder, olehId: number, catatan?: string | null) {
  await tx.order.update({ where: { id: o.id }, data: { status: ke, tahapMulai: new Date() } });
  await tx.riwayatOrder.create({ data: { orderId: o.id, olehId, dari: o.status, ke, catatan: catatan || null } });
}

export async function catat(tx: Db, orderId: number, status: StatusOrder, olehId: number, catatan: string) {
  await tx.riwayatOrder.create({ data: { orderId, olehId, dari: status, ke: status, catatan } });
}

export async function idPeran(tx: Db, ...peran: Peran[]) {
  return (await tx.user.findMany({ where: { peran: { in: peran }, aktif: true }, select: { id: true } })).map(u => u.id);
}

/** Nomor dokumen berurutan per awalan dan tahun, mis. SPK/004/TRN/D3/XI/2026. */
export async function nomorBaru(hitung: (pola: { startsWith: string; endsWith: string }) => Promise<number>, awal: string, tengah: string) {
  const sekarang = new Date();
  const tahun = ymd(sekarang).slice(0, 4);
  const n = await hitung({ startsWith: `${awal}/`, endsWith: `/${tahun}` });
  return `${awal}/${String(n + 1).padStart(3, '0')}/${tengah}${tengah ? '/' : ''}${bulanRomawi(sekarang)}/${tahun}`;
}

// ---------- SLA ----------

export type KeadaanSla = 'aman' | 'dekat' | 'lewat';
export type Sla = { batas: Date; keadaan: KeadaanSla } | null;

export async function petaSla(): Promise<Partial<Record<StatusOrder, number>>> {
  const rows = await db.sla.findMany();
  return { ...SLA_DEFAULT, ...Object.fromEntries(rows.map(r => [r.status, r.hari])) };
}

/** Batas waktu tahap saat ini dan keadaannya. Persiapan dibatasi tanggal mulai, pelaksanaan dibatasi tanggal selesai. */
export function hitungSla(o: Pick<Order, 'status' | 'tahapMulai' | 'tglMulai' | 'tglSelesai'>, peta: Partial<Record<StatusOrder, number>>, now = Date.now()): Sla {
  if (STATUS_TUTUP.includes(o.status)) return null;
  let batas: Date;
  if (o.status === StatusOrder.PERSIAPAN) batas = o.tglMulai;
  else if (o.status === StatusOrder.PELAKSANAAN) batas = new Date(o.tglSelesai.getTime() + HARI);
  else {
    const hari = peta[o.status];
    if (!hari) return null;
    batas = new Date(o.tahapMulai.getTime() + hari * HARI);
  }
  const jendela = Math.max(batas.getTime() - o.tahapMulai.getTime(), HARI);
  const sisa = batas.getTime() - now;
  const keadaan: KeadaanSla = sisa < 0 ? 'lewat' : sisa < Math.max(HARI, jendela * 0.3) ? 'dekat' : 'aman';
  return { batas, keadaan };
}

/** Pengguna yang bertanggung jawab di tahap tertentu (penerima pengingat SLA). */
async function penanggungJawab(o: Order & { silabus: { diteruskanPada: Date | null } | null }) {
  switch (o.status) {
    case StatusOrder.RFQ: case StatusOrder.QUOTATION: case StatusOrder.SPK_DRAF: case StatusOrder.LAPORAN:
      return [o.marketingId];
    case StatusOrder.SILABUS_RAK:
      return o.silabus?.diteruskanPada && o.unitId
        ? (await db.user.findMany({ where: { peran: Peran.upt, unitId: o.unitId, aktif: true }, select: { id: true } })).map(u => u.id)
        : idPeran(db, Peran.dps);
    case StatusOrder.APPROVAL_1: return idPeran(db, Peran.kadep_marketing);
    case StatusOrder.APPROVAL_2: return idPeran(db, Peran.kadep_dps);
    default: return idPeran(db, Peran.dps);
  }
}

/** Kirim pengingat sekali per tahap untuk order yang melewati SLA (Automatic Reminders). */
export async function kirimPengingatSla() {
  const peta = await petaSla();
  const orders = await db.order.findMany({ where: { status: { notIn: STATUS_TUTUP } }, include: { silabus: { select: { diteruskanPada: true } } } });
  for (const o of orders) {
    if (o.pengingatSla === o.status || hitungSla(o, peta)?.keadaan !== 'lewat') continue;
    const ids = await penanggungJawab(o);
    await db.$transaction(async tx => {
      await notifyBanyak(tx, ids, `Lewat SLA: ${o.nomorRfq} "${o.judul}" masih di tahap ini.`, `/order/${o.id}`);
      await tx.order.update({ where: { id: o.id }, data: { pengingatSla: o.status } });
    });
  }
}

// ---------- RFQ ----------

export type DataRfq = {
  customerId: string; customerBaru: DataCustomer | null;
  jenis: string; judul: string; deskripsi: string; tglMulai: string; tglSelesai: string; lokasi: string; jumlahPeserta: string;
  detail: Detail;
};

function tanggalWajib(s: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) gagal(`${label} wajib diisi.`);
  return tanggalDb(s);
}

/** Validasi atribut wajib sesuai jenis layanan; hanya atribut yang dikenal yang disimpan. */
export function detailValid(jenis: JenisLayanan, d: Detail): Detail {
  const out: Detail = {};
  for (const a of LAYANAN[jenis].atribut) {
    const v = teks(d[a.key]);
    if (a.wajib && !v) gagal(`${a.label} wajib diisi untuk layanan ${LAYANAN[jenis].label}.`);
    if (v && a.tipe === 'number' && !(Number(v.replace(/[^\d]/g, '')) > 0)) gagal(`${a.label} harus berupa angka lebih dari 0.`);
    if (v && a.opsi && !a.opsi.includes(v)) gagal(`Pilihan ${a.label} tidak valid.`);
    if (v) out[a.key] = a.tipe === 'number' ? v.replace(/[^\d]/g, '') : v;
  }
  return out;
}

function jadwalValid(mulai: string, selesai: string) {
  const tglMulai = tanggalWajib(mulai, 'Tanggal mulai');
  const tglSelesai = tanggalWajib(selesai, 'Tanggal selesai');
  if (tglSelesai < tglMulai) gagal('Tanggal selesai tidak boleh sebelum tanggal mulai.');
  return { tglMulai, tglSelesai };
}

export async function buatRfq(marketing: Pengguna, d: DataRfq) {
  wajibPeran(marketing, Peran.marketing);
  if (!(d.jenis in JenisLayanan)) gagal('Pilih jenis layanan.');
  const jenis = d.jenis as JenisLayanan;
  const judul = wajib(d.judul, 'Judul kebutuhan');
  const deskripsi = wajib(d.deskripsi, 'Deskripsi kebutuhan customer');
  const { tglMulai, tglSelesai } = jadwalValid(d.tglMulai, d.tglSelesai);
  if (tglMulai < hariIni()) gagal('Tanggal mulai tidak boleh di masa lalu.');
  const lokasi = wajib(d.lokasi, 'Lokasi');
  const peserta = Number(d.jumlahPeserta) || null;
  if (BUTUH_PESERTA.includes(jenis) && !peserta) gagal(jenis === JenisLayanan.SEWA_RUANG ? 'Jumlah pengguna wajib diisi.' : 'Jumlah peserta wajib diisi.');
  const detail = detailValid(jenis, d.detail);

  let customerId = Number(d.customerId) || 0;
  const baru = d.customerBaru ? customerValid(d.customerBaru) : null;
  if (!baru && !(await db.customer.findUnique({ where: { id: customerId } }))) gagal('Pilih customer atau isi data customer baru.');
  if (baru && (await db.customer.findUnique({ where: { nama: baru.nama } }))) gagal('Customer dengan nama ini sudah terdaftar; pilih dari daftar.');

  const nomorRfq = await nomorBaru(p => db.order.count({ where: { nomorRfq: p } }), 'RFQ', 'D3');
  return db.$transaction(async tx => {
    if (baru) customerId = (await tx.customer.create({ data: baru })).id;
    const o = await tx.order.create({
      data: { nomorRfq, customerId, marketingId: marketing.id, jenis, judul, deskripsi, tglMulai, tglSelesai, lokasi, jumlahPeserta: peserta, detail },
    });
    await tx.riwayatOrder.create({ data: { orderId: o.id, olehId: marketing.id, ke: StatusOrder.RFQ, catatan: 'RFQ dicatat' } });
    return o;
  });
}

/** Analisis kesanggupan: sanggup → Request Silabus & RAK ke DPS; tidak sanggup → order ditutup dengan alasan. */
export async function analisis(marketing: Pengguna, id: number, d: { sanggup: string; unitId: string; catatan: string; alasan: string }) {
  wajibPeran(marketing, Peran.marketing);
  const o = await orderDiTahap(id, StatusOrder.RFQ);
  if (d.sanggup === 'tidak') {
    const alasan = wajib(d.alasan, 'Alasan tidak sanggup');
    await db.$transaction(async tx => {
      await tx.order.update({ where: { id }, data: { alasanTutup: alasan } });
      await pindahTahap(tx, o, StatusOrder.DITOLAK, marketing.id, alasan);
    });
    return;
  }
  if (d.sanggup !== 'ya') gagal('Pilih hasil analisis kesanggupan.');
  const unitId = Number(d.unitId);
  if (!unitId || !(await db.unit.findUnique({ where: { id: unitId } }))) gagal('Pilih UPT/Prodi yang diusulkan menyusun silabus.');
  const peta = await petaSla();
  const tenggat = tanggalDb(ymd(new Date(Date.now() + (peta.SILABUS_RAK ?? 7) * HARI)));
  await db.$transaction(async tx => {
    await tx.order.update({ where: { id }, data: { unitId } });
    await tx.silabus.create({ data: { orderId: id, tenggat, catatanMarketing: teks(d.catatan) || null } });
    await pindahTahap(tx, o, StatusOrder.SILABUS_RAK, marketing.id, 'Sanggup; request Silabus & RAK ke DPS');
    await notifyBanyak(tx, await idPeran(tx, Peran.dps), `Request Silabus & RAK: ${o.nomorRfq} "${o.judul}"`, `/order/${id}`);
  });
}

/** Schedule Adjustment Log: ubah tanggal tanpa membatalkan draft/SPK. Booking fasilitas ikut bergeser. */
export async function ubahJadwal(u: Pengguna, id: number, d: { tglMulai: string; tglSelesai: string; alasan: string }) {
  wajibPeran(u, Peran.marketing, Peran.dps);
  const o = await orderDiTahap(id, ...BOLEH_UBAH_JADWAL);
  const { tglMulai, tglSelesai } = jadwalValid(d.tglMulai, d.tglSelesai);
  if (+tglMulai === +o.tglMulai && +tglSelesai === +o.tglSelesai) gagal('Tanggal baru sama dengan jadwal sekarang.');
  const alasan = wajib(d.alasan, 'Alasan perubahan jadwal');
  const booking = await db.bookingFasilitas.findMany({ where: { orderId: id }, include: { fasilitas: true } });
  for (const b of booking) {
    const lain = await bentrokFasilitas(b.fasilitasId, tglMulai, tglSelesai, id);
    if (lain) gagal(`${b.fasilitas.nama} sudah dipakai ${lain} pada tanggal baru.`);
  }
  await db.$transaction(async tx => {
    await tx.jadwalLog.create({ data: { orderId: id, olehId: u.id, mulaiLama: o.tglMulai, selesaiLama: o.tglSelesai, mulaiBaru: tglMulai, selesaiBaru: tglSelesai, alasan } });
    await tx.order.update({ where: { id }, data: { tglMulai, tglSelesai } });
    await tx.bookingFasilitas.updateMany({ where: { orderId: id }, data: { mulai: tglMulai, selesai: tglSelesai } });
    await catat(tx, id, o.status, u.id, `Jadwal diubah: ${alasan}`);
    const lain = u.peran === Peran.marketing ? await idPeran(tx, Peran.dps) : [o.marketingId];
    await notifyBanyak(tx, lain, `Jadwal ${o.nomorRfq} "${o.judul}" berubah; konfirmasi ulang pengajar bila perlu.`, `/order/${id}`);
  });
}

export async function notifyMarketing(tx: Db, o: Pick<Order, 'marketingId' | 'id' | 'nomorRfq' | 'judul'>, pesan: string) {
  await notify(tx, o.marketingId, `${o.nomorRfq}: ${pesan}`, `/order/${o.id}`);
}
