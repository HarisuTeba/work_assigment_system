import { Peran, StatusTugas } from '@prisma/client';
import { db } from '../db';
import { gagal, wajib } from '../errors';
import type { Pengguna } from '../session';
import { STATUS_AKTIF, STATUS_RESPON, STATUS_TUTUP, notify } from './aturan';

const ikutPerintah = { perintah: true } as const;

/** Penugasan milik staff ini; selain itu dianggap tidak ada. */
export async function penugasanMilikStaff(staff: Pengguna, id: number) {
  const p = await db.penugasan.findUnique({ where: { id }, include: ikutPerintah });
  if (!p || p.staffId !== staff.id || staff.peran !== Peran.staff) gagal('Penugasan tidak ditemukan.');
  return p;
}

/** Penugasan dari perintah buatan SPV ini. */
export async function penugasanMilikSpv(spv: Pengguna, id: number) {
  const p = await db.penugasan.findUnique({ where: { id }, include: { ...ikutPerintah, staff: true } });
  if (!p || p.perintah.spvId !== spv.id) gagal('Penugasan tidak ditemukan.');
  return p;
}

/** Jumlah tugas aktif staff dibanding batas KPI-nya. */
export async function infoKpi(staffId: number) {
  const [u, aktif] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: staffId }, select: { batasTugasAktif: true } }),
    db.penugasan.count({ where: { staffId, status: { in: STATUS_AKTIF } } }),
  ]);
  return { aktif, batas: u.batasTugasAktif, penuh: aktif >= u.batasTugasAktif };
}

export async function tanya(staff: Pengguna, id: number, isi: string) {
  const p = await penugasanMilikStaff(staff, id);
  if (STATUS_TUTUP.includes(p.status) || p.status === StatusTugas.DISETUJUI) gagal('Penugasan sudah ditutup; sampaikan lewat laporan.');
  const q = wajib(isi, 'Pertanyaan');
  await db.$transaction(async tx => {
    await tx.pertanyaan.create({ data: { penugasanId: id, isi: q } });
    if (p.status === StatusTugas.MENUNGGU_RESPON) await tx.penugasan.update({ where: { id }, data: { status: StatusTugas.MENUNGGU_JAWABAN } });
    await notify(tx, p.perintah.spvId, `${staff.nama} bertanya tentang "${p.perintah.judul}"`, `/spv/penugasan/${id}`);
  });
}

export async function jawab(spv: Pengguna, pertanyaanId: number, jawaban: string) {
  const q = await db.pertanyaan.findUnique({ where: { id: pertanyaanId } });
  if (!q) gagal('Pertanyaan tidak ditemukan.');
  const p = await penugasanMilikSpv(spv, q.penugasanId);
  if (q.jawaban) gagal('Pertanyaan ini sudah dijawab.');
  const j = wajib(jawaban, 'Jawaban');
  await db.$transaction(async tx => {
    await tx.pertanyaan.update({ where: { id: q.id }, data: { jawaban: j, dijawabPada: new Date() } });
    const terbuka = await tx.pertanyaan.count({ where: { penugasanId: p.id, jawaban: null } });
    if (p.status === StatusTugas.MENUNGGU_JAWABAN && !terbuka) {
      await tx.penugasan.update({ where: { id: p.id }, data: { status: StatusTugas.MENUNGGU_RESPON } });
    }
    await notify(tx, p.staffId, `${spv.nama} menjawab pertanyaan Anda di "${p.perintah.judul}"`, `/staff/tugas/${p.id}`);
  });
}

/** Staff menyatakan paham dan menerima. Boleh di atas KPI, tetapi dicatat. */
export async function terima(staff: Pengguna, id: number) {
  const p = await penugasanMilikStaff(staff, id);
  if (p.status === StatusTugas.MENUNGGU_JAWABAN) gagal('Masih ada pertanyaan yang belum dijawab SPV.');
  if (p.status !== StatusTugas.MENUNGGU_RESPON) gagal('Penugasan ini sudah direspons.');
  const kpi = await infoKpi(staff.id);
  await db.$transaction(async tx => {
    await tx.penugasan.update({
      where: { id },
      data: { status: StatusTugas.DITERIMA, diterimaPada: new Date(), diAtasKpi: kpi.penuh },
    });
    const catatan = kpi.penuh ? ` (di atas batas KPI: ${kpi.aktif + 1}/${kpi.batas} tugas aktif)` : '';
    await notify(tx, p.perintah.spvId, `${staff.nama} menerima "${p.perintah.judul}"${catatan}`, `/spv/penugasan/${id}`);
  });
}

export async function tolak(staff: Pengguna, id: number, alasan: string) {
  const p = await penugasanMilikStaff(staff, id);
  if (!STATUS_RESPON.includes(p.status)) gagal('Penugasan ini sudah direspons.');
  const a = wajib(alasan, 'Alasan penolakan');
  await db.$transaction(async tx => {
    await tx.penugasan.update({ where: { id }, data: { status: StatusTugas.DITOLAK_STAFF, alasanTolak: a } });
    await notify(tx, p.perintah.spvId, `${staff.nama} menolak "${p.perintah.judul}": ${a}`, `/spv/perintah/${p.perintahId}`);
  });
}

/** Tandai penugasan yang melewati tenggat sebelum laporan akhir dikirim. */
export async function refreshTerlambat() {
  await db.penugasan.updateMany({
    where: {
      terlambat: false,
      status: { notIn: [...STATUS_TUTUP, StatusTugas.DISETUJUI] },
      perintah: { tenggat: { lt: new Date() } },
    },
    data: { terlambat: true },
  });
}
