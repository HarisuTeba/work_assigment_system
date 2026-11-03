import { AksiPengesahan, JenisPerintah, Peran, Prioritas, StatusDokumen } from '@prisma/client';
import { db } from '../db';
import { gagal, teks, wajib } from '../errors';
import type { Pengguna } from '../session';
import { bulanRomawi, ymd, tanggalDb } from '../waktu';
import { STATUS_AKTIF, notify, notifyBanyak, type Db } from './aturan';

export const DOKUMEN_BISA_DIUBAH: StatusDokumen[] = [StatusDokumen.DRAF, StatusDokumen.DITOLAK];
export const DOKUMEN_SAH: StatusDokumen[] = [StatusDokumen.DISAHKAN, StatusDokumen.DITURUNKAN];

function wajibPeran(u: Pengguna, peran: Peran) {
  if (u.peran !== peran || !u.divisiId) gagal('Anda tidak memiliki akses untuk tindakan ini.');
}

/** Perintah buatan SPV ini; selain itu dianggap tidak ada. */
export async function perintahMilikSpv(spv: Pengguna, id: number) {
  const pr = await db.perintahKerja.findUnique({ where: { id } });
  if (!pr || pr.spvId !== spv.id) gagal('Perintah kerja tidak ditemukan.');
  return pr;
}

/** Perintah di divisi Manager ini yang sudah pernah diajukan. */
export async function perintahDivisiManager(manager: Pengguna, id: number) {
  const pr = await db.perintahKerja.findUnique({ where: { id } });
  if (!pr || pr.divisiId !== manager.divisiId || pr.status === StatusDokumen.DRAF) gagal('Perintah kerja tidak ditemukan.');
  return pr;
}

export type DataPerintah = {
  jenis: string; judul: string; apa: string; mengapa: string; diMana: string; bagaimana: string;
  prioritas: string; tenggat: Date | null; langkah: string[];
  noPo: string; tglPo: string; klien: string; nilaiPo: string; lampiranPo: string | null;
};

/** Buat atau ubah draf ISPK/SPK. Bila `ajukan`, langsung dikirim ke Manager divisi. */
export async function simpanPerintah(spv: Pengguna, id: number | null, d: DataPerintah, ajukan: boolean) {
  wajibPeran(spv, Peran.spv);
  const lama = id ? await perintahMilikSpv(spv, id) : null;
  if (lama && !DOKUMEN_BISA_DIUBAH.includes(lama.status)) gagal('Perintah yang sudah diajukan atau disahkan tidak bisa diubah.');

  if (!(d.jenis in JenisPerintah)) gagal('Pilih jenis perintah: ISPK atau SPK.');
  const jenis = d.jenis as JenisPerintah;
  const judul = wajib(d.judul, 'Judul pekerjaan');
  if (judul.length > 120) gagal('Judul maksimal 120 karakter.');
  if (!(d.prioritas in Prioritas)) gagal('Pilih prioritas.');
  const apa = wajib(d.apa, 'Lingkup pekerjaan');
  const mengapa = wajib(d.mengapa, 'Tujuan');
  const diMana = wajib(d.diMana, 'Lokasi');
  const bagaimana = wajib(d.bagaimana, 'Standar hasil');
  if (!d.tenggat) gagal('Tenggat wajib diisi.');
  if (d.tenggat.getTime() <= Date.now()) gagal('Tenggat harus di masa depan.');
  const langkah = d.langkah.map(teks).filter(Boolean);
  if (!langkah.length) gagal('Tambahkan minimal 1 langkah kerja.');
  if (langkah.some(l => l.length > 255)) gagal('Satu langkah maksimal 255 karakter.');

  let po = { noPo: null as string | null, tglPo: null as Date | null, klien: null as string | null, nilaiPo: null as string | null, lampiranPo: null as string | null };
  if (jenis === JenisPerintah.SPK) {
    const nilai = Number(String(d.nilaiPo).replace(/[^\d]/g, ''));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.tglPo)) gagal('Tanggal PO wajib diisi.');
    if (!nilai) gagal('Nilai PO wajib diisi dan lebih dari 0.');
    po = {
      noPo: wajib(d.noPo, 'Nomor PO'),
      tglPo: tanggalDb(d.tglPo),
      klien: wajib(d.klien, 'Nama klien'),
      nilaiPo: String(nilai),
      lampiranPo: d.lampiranPo ?? lama?.lampiranPo ?? null,
    };
    if (!po.lampiranPo) gagal('Lampirkan dokumen PO (PDF/JPG/PNG).');
  }

  const data = {
    jenis, judul, apa, mengapa, diMana, bagaimana, prioritas: d.prioritas as Prioritas, tenggat: d.tenggat, ...po,
    status: ajukan ? StatusDokumen.MENUNGGU_PENGESAHAN : StatusDokumen.DRAF,
    diajukanPada: ajukan ? new Date() : null,
  };

  return db.$transaction(async tx => {
    const pr = lama
      ? await tx.perintahKerja.update({ where: { id: lama.id }, data })
      : await tx.perintahKerja.create({ data: { ...data, spvId: spv.id, divisiId: spv.divisiId! } });
    await tx.langkah.deleteMany({ where: { perintahId: pr.id } });
    await tx.langkah.createMany({ data: langkah.map((deskripsi, i) => ({ perintahId: pr.id, urutan: i + 1, deskripsi })) });
    if (ajukan) await catatPengajuan(tx, spv, pr.id, pr.jenis, pr.judul);
    return pr;
  });
}

async function catatPengajuan(tx: Db, spv: Pengguna, id: number, jenis: JenisPerintah, judul: string) {
  await tx.riwayatPengesahan.create({ data: { perintahId: id, olehId: spv.id, aksi: AksiPengesahan.DIAJUKAN } });
  const managers = await tx.user.findMany({ where: { peran: Peran.manager, divisiId: spv.divisiId, aktif: true }, select: { id: true } });
  await notifyBanyak(tx, managers.map(m => m.id), `${spv.nama} mengajukan ${jenis} "${judul}" untuk disahkan`, `/manager/pengesahan/${id}`);
}

export async function ajukanPerintah(spv: Pengguna, id: number) {
  const pr = await perintahMilikSpv(spv, id);
  if (!DOKUMEN_BISA_DIUBAH.includes(pr.status)) gagal('Perintah ini sudah diajukan.');
  if (pr.tenggat.getTime() <= Date.now()) gagal('Tenggat sudah lewat. Ubah tenggat sebelum mengajukan.');
  await db.$transaction(async tx => {
    await tx.perintahKerja.update({ where: { id }, data: { status: StatusDokumen.MENUNGGU_PENGESAHAN, diajukanPada: new Date() } });
    await catatPengajuan(tx, spv, id, pr.jenis, pr.judul);
  });
}

export async function hapusDraf(spv: Pengguna, id: number) {
  const pr = await perintahMilikSpv(spv, id);
  if (pr.status !== StatusDokumen.DRAF) gagal('Hanya draf yang belum pernah diajukan yang bisa dihapus.');
  await db.perintahKerja.delete({ where: { id } });
}

/** Nomor resmi: JENIS/urut/KODE-DIVISI/bulan-romawi/tahun, urut per jenis, divisi, dan tahun. */
async function nomorBaru(jenis: JenisPerintah, divisiId: number, kode: string, saat: Date) {
  const tahun = ymd(saat).slice(0, 4);
  const sudah = await db.perintahKerja.count({
    where: { jenis, divisiId, nomor: { not: null, endsWith: `/${tahun}` } },
  });
  return `${jenis}/${String(sudah + 1).padStart(3, '0')}/${kode}/${bulanRomawi(saat)}/${tahun}`;
}

export async function sahkanPerintah(manager: Pengguna, id: number, catatan: string) {
  wajibPeran(manager, Peran.manager);
  const pr = await perintahDivisiManager(manager, id);
  if (pr.status !== StatusDokumen.MENUNGGU_PENGESAHAN) gagal('Perintah ini tidak sedang menunggu pengesahan.');
  const saat = new Date();
  const nomor = await nomorBaru(pr.jenis, pr.divisiId, manager.divisi!.kode, saat);
  await db.$transaction(async tx => {
    await tx.perintahKerja.update({
      where: { id },
      data: { status: StatusDokumen.DISAHKAN, nomor, managerId: manager.id, disahkanPada: saat, alasanTolak: null },
    });
    await tx.riwayatPengesahan.create({ data: { perintahId: id, olehId: manager.id, aksi: AksiPengesahan.DISAHKAN, catatan: teks(catatan) || null } });
    await notify(tx, pr.spvId, `${pr.jenis} "${pr.judul}" disahkan dengan nomor ${nomor}. Silakan turunkan ke staff.`, `/spv/perintah/${id}`);
  });
  return nomor;
}

export async function tolakPerintah(manager: Pengguna, id: number, alasan: string) {
  wajibPeran(manager, Peran.manager);
  const pr = await perintahDivisiManager(manager, id);
  if (pr.status !== StatusDokumen.MENUNGGU_PENGESAHAN) gagal('Perintah ini tidak sedang menunggu pengesahan.');
  const a = wajib(alasan, 'Alasan penolakan');
  await db.$transaction(async tx => {
    await tx.perintahKerja.update({ where: { id }, data: { status: StatusDokumen.DITOLAK, alasanTolak: a, managerId: manager.id } });
    await tx.riwayatPengesahan.create({ data: { perintahId: id, olehId: manager.id, aksi: AksiPengesahan.DITOLAK, catatan: a } });
    await notify(tx, pr.spvId, `${pr.jenis} "${pr.judul}" ditolak Manager. Lihat alasannya dan revisi.`, `/spv/perintah/${id}`);
  });
}

/** Turunkan perintah yang sudah disahkan ke satu atau beberapa staff divisi. */
export async function turunkanPerintah(spv: Pengguna, id: number, staffIds: number[]) {
  const pr = await perintahMilikSpv(spv, id);
  if (!DOKUMEN_SAH.includes(pr.status)) gagal('Perintah harus disahkan Manager sebelum diturunkan ke staff.');
  const ids = [...new Set(staffIds.filter(Boolean))];
  if (!ids.length) gagal('Pilih minimal 1 staff.');
  const staff = await db.user.findMany({ where: { id: { in: ids }, peran: Peran.staff, aktif: true, divisiId: spv.divisiId } });
  if (staff.length !== ids.length) gagal('Pilih staff aktif dari divisi Anda.');
  const sudah = await db.penugasan.findMany({ where: { perintahId: id, staffId: { in: ids } }, include: { staff: true } });
  if (sudah.length) gagal(`${sudah.map(s => s.staff.nama).join(', ')} sudah pernah menerima perintah ini.`);
  const langkah = await db.langkah.findMany({ where: { perintahId: id }, orderBy: { urutan: 'asc' } });
  const target = tanggalDb(ymd(pr.tenggat));

  await db.$transaction(async tx => {
    for (const s of staff) {
      const p = await tx.penugasan.create({ data: { perintahId: id, staffId: s.id } });
      // Langkah dari SPV menjadi Action Plan awal; staff menyesuaikan target tanggalnya.
      await tx.actionPlan.createMany({
        data: langkah.map(l => ({ penugasanId: p.id, urutan: l.urutan, kegiatan: l.deskripsi, targetTanggal: target })),
      });
      await notify(tx, s.id, `Perintah kerja baru ${pr.nomor}: "${pr.judul}"`, `/staff/tugas/${p.id}`);
    }
    await tx.perintahKerja.update({ where: { id }, data: { status: StatusDokumen.DITURUNKAN } });
    await tx.riwayatPengesahan.create({
      data: { perintahId: id, olehId: spv.id, aksi: AksiPengesahan.DITURUNKAN, catatan: staff.map(s => s.nama).join(', ') },
    });
  });
}

/** Staff divisi beserta jumlah tugas aktifnya, untuk memilih penerima. */
export async function staffDenganKpi(divisiId: number) {
  const staff = await db.user.findMany({
    where: { peran: Peran.staff, aktif: true, divisiId },
    orderBy: { nama: 'asc' },
    include: { penugasan: { where: { status: { in: STATUS_AKTIF } }, select: { id: true } } },
  });
  return staff.map(s => ({ ...s, jumlahAktif: s.penugasan.length, penuh: s.penugasan.length >= s.batasTugasAktif }));
}
