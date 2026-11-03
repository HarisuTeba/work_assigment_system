import { Peran, StatusPica, StatusTugas } from '@prisma/client';
import { db } from '../db';
import { JENDELA_EVALUASI, STATUS_AKTIF } from './aturan';
import { hariBolong } from './laporan';

/** Rekap kinerja staff satu divisi: KPI tugas aktif, keterlambatan, PICA terbuka, laporan bolong, poin. */
export async function rekapDivisi(divisiId: number) {
  const sejak = new Date(Date.now() - JENDELA_EVALUASI);
  const staff = await db.user.findMany({
    where: { peran: Peran.staff, aktif: true, divisiId },
    orderBy: { nama: 'asc' },
    include: {
      rewardDiterima: { select: { poin: true } },
      penugasan: {
        include: {
          laporanHarian: { select: { tanggal: true } },
          laporanMingguan: { include: { pica: { where: { status: StatusPica.OPEN } } } },
          perintah: { select: { tenggat: true } },
        },
      },
    },
  });
  return staff.map(s => {
    const aktif = s.penugasan.filter(p => STATUS_AKTIF.includes(p.status));
    return {
      user: s,
      aktif: aktif.length,
      batas: s.batasTugasAktif,
      menunggu: s.penugasan.filter(p => p.status === StatusTugas.MENUNGGU_RESPON || p.status === StatusTugas.MENUNGGU_JAWABAN).length,
      terlambat: s.penugasan.filter(p => p.terlambat && p.perintah.tenggat >= sejak).length,
      picaOpen: s.penugasan.reduce((n, p) => n + p.laporanMingguan.reduce((m, l) => m + l.pica.length, 0), 0),
      bolong: aktif.reduce((n, p) => n + hariBolong(p, p.laporanHarian, sejak).length, 0),
      poin: s.rewardDiterima.reduce((a, r) => a + r.poin, 0),
    };
  });
}

/** PICA terbuka di divisi, paling mendesak dulu. */
export function picaTerbukaDivisi(divisiId: number) {
  return db.pica.findMany({
    where: { status: StatusPica.OPEN, laporanMingguan: { penugasan: { perintah: { divisiId } } } },
    include: { laporanMingguan: { include: { penugasan: { include: { staff: true, perintah: true } } } } },
    orderBy: { dueDate: 'asc' },
  });
}
