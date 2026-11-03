import { JenisReward, Keputusan, Peran, StatusTugas, TingkatTeguran } from '@prisma/client';
import { db } from '../db';
import { gagal, rata, teks, wajib } from '../errors';
import type { Pengguna } from '../session';
import { BATAS_BOLONG, JEDA_TEGURAN, JENDELA_EVALUASI, STATUS_AKTIF, TINGKAT_TEGURAN, hitungPoin, notify, skorRata } from './aturan';
import { hariBolong } from './laporan';
import { penugasanMilikSpv } from './penugasan';

function skorValid(v: unknown, label: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 5) gagal(`Skor ${label} harus 1 sampai 5.`);
  return n;
}

async function staffDivisi(spv: Pengguna, staffId: unknown) {
  if (spv.peran !== Peran.spv) gagal('Anda tidak memiliki akses untuk tindakan ini.');
  const s = await db.user.findFirst({ where: { id: Number(staffId) || 0, peran: Peran.staff, aktif: true, divisiId: spv.divisiId } });
  if (!s) gagal('Pilih staff dari divisi Anda.');
  return s;
}

export async function evaluasiPenugasan(
  spv: Pengguna, id: number,
  d: { skorWaktu: string; skorKualitas: string; skorKesesuaian: string; keputusan: string; umpanBalik: string; bukaMulai: string },
) {
  const p = await penugasanMilikSpv(spv, id);
  if (p.status !== StatusTugas.DILAPORKAN) gagal('Hanya penugasan dengan laporan akhir yang bisa dievaluasi.');
  const skorWaktu = skorValid(d.skorWaktu, 'ketepatan waktu');
  const skorKualitas = skorValid(d.skorKualitas, 'kualitas hasil');
  const skorKesesuaian = skorValid(d.skorKesesuaian, 'kesesuaian instruksi');
  if (!(d.keputusan in Keputusan)) gagal('Pilih keputusan: setujui atau revisi.');
  const keputusan = d.keputusan as Keputusan;
  const umpanBalik = teks(d.umpanBalik);
  if (keputusan === Keputusan.revisi && !umpanBalik) gagal('Tuliskan apa yang perlu direvisi pada umpan balik.');

  await db.$transaction(async tx => {
    await tx.evaluasi.create({ data: { penugasanId: id, skorWaktu, skorKualitas, skorKesesuaian, keputusan, umpanBalik: umpanBalik || null } });
    if (keputusan === Keputusan.setujui) {
      const tepat = !!p.dilaporkanPada && p.dilaporkanPada <= p.perintah.tenggat;
      const poin = hitungPoin(skorRata({ skorWaktu, skorKualitas, skorKesesuaian }), tepat);
      await tx.penugasan.update({ where: { id }, data: { status: StatusTugas.DISETUJUI } });
      await tx.reward.create({
        data: {
          penerimaId: p.staffId, pemberiId: spv.id, penugasanId: id, jenis: JenisReward.otomatis, poin,
          pesan: `Poin evaluasi "${p.perintah.judul}"${tepat ? ' (termasuk bonus tepat waktu)' : ''}`.slice(0, 255),
        },
      });
      await notify(tx, p.staffId, `"${p.perintah.judul}" disetujui. Anda mendapat ${poin} poin.`, `/staff/tugas/${id}`);
    } else {
      await tx.penugasan.update({ where: { id }, data: { status: StatusTugas.REVISI } });
      // AP mulai urutan tertentu dibuka kembali agar staff mengerjakan ulang bagian itu.
      const mulai = Number(d.bukaMulai) || 0;
      if (mulai) {
        await tx.actionPlan.updateMany({ where: { penugasanId: id, urutan: { gte: mulai } }, data: { selesai: false, selesaiPada: null } });
      }
      await notify(tx, p.staffId, `"${p.perintah.judul}" perlu revisi. Lihat umpan balik SPV.`, `/staff/tugas/${id}`);
    }
  });
}

export async function beriReward(spv: Pengguna, d: { staffId: string; jenis: string; poin: string; pesan: string }) {
  const s = await staffDivisi(spv, d.staffId);
  if (d.jenis !== JenisReward.pujian && d.jenis !== JenisReward.sertifikat) gagal('Pilih jenis reward.');
  let poin = 0;
  if (d.jenis === JenisReward.pujian) {
    poin = Number(d.poin);
    if (!Number.isInteger(poin) || poin < 0 || poin > 20) gagal('Poin bonus pujian 0 sampai 20.');
  }
  const pesan = wajib(d.pesan, 'Pesan apresiasi');
  await db.$transaction(async tx => {
    await tx.reward.create({ data: { penerimaId: s.id, pemberiId: spv.id, jenis: d.jenis as JenisReward, poin, pesan: pesan.slice(0, 255) } });
    const label = d.jenis === JenisReward.sertifikat ? 'Sertifikat Karyawan Teladan' : `pujian${poin ? ` (+${poin} poin)` : ''}`;
    await notify(tx, s.id, `${spv.nama} memberi Anda ${label}.`, '/staff/nilai');
  });
}

export async function beriTeguran(spv: Pengguna, d: { staffId: string; tingkat: string; alasan: string; catatanPembinaan: string }) {
  const s = await staffDivisi(spv, d.staffId);
  if (!(d.tingkat in TingkatTeguran)) gagal('Pilih tingkat teguran.');
  const alasan = wajib(d.alasan, 'Alasan');
  const catatanPembinaan = wajib(d.catatanPembinaan, 'Catatan pembinaan');
  await db.$transaction(async tx => {
    await tx.teguran.create({ data: { penerimaId: s.id, pemberiId: spv.id, tingkat: d.tingkat as TingkatTeguran, alasan, catatanPembinaan } });
    await notify(tx, s.id, `Anda menerima teguran (${d.tingkat}) dari ${spv.nama}.`, '/staff/teguran');
  });
}

export async function tandaiTeguranDibaca(staff: Pengguna, id: number) {
  const t = await db.teguran.findUnique({ where: { id } });
  if (!t || t.penerimaId !== staff.id) gagal('Teguran tidak ditemukan.');
  if (t.dibacaPada) return;
  await db.$transaction(async tx => {
    await tx.teguran.update({ where: { id }, data: { dibacaPada: new Date() } });
    await notify(tx, t.pemberiId, `${staff.nama} telah membaca teguran ${t.tingkat}.`, '/spv/teguran');
  });
}

// ---------- Statistik ----------

export async function totalPoin(staffId: number) {
  const r = await db.reward.aggregate({ where: { penerimaId: staffId }, _sum: { poin: true } });
  return r._sum.poin ?? 0;
}

/** Nilai akhir = evaluasi yang disetujui (evaluasi revisi tidak dihitung dua kali). */
async function evaluasiFinal(staffId: number, sejak?: Date) {
  return db.evaluasi.findMany({
    where: { keputusan: Keputusan.setujui, penugasan: { staffId }, ...(sejak ? { dibuatPada: { gte: sejak } } : {}) },
  });
}

export async function rataNilai(staffId: number, sejak?: Date) {
  return rata((await evaluasiFinal(staffId, sejak)).map(skorRata));
}

export type SaranTeguran = { staff: { id: number; nama: string; jabatan: string }; alasan: string[]; saranTingkat: string; jumlahTeguran: number };

/** Staff divisi yang layak dipertimbangkan untuk ditegur, beserta alasannya. Keputusan tetap di SPV. */
export async function saranTeguran(spv: Pengguna): Promise<SaranTeguran[]> {
  const now = Date.now();
  const sejak = new Date(now - JENDELA_EVALUASI);
  const staff = await db.user.findMany({
    where: { peran: Peran.staff, aktif: true, divisiId: spv.divisiId },
    include: {
      penugasan: { include: { perintah: { select: { tenggat: true } }, laporanHarian: { select: { tanggal: true } } } },
      teguranDiterima: { select: { dibuatPada: true } },
    },
  });
  const hasil: SaranTeguran[] = [];
  for (const s of staff) {
    const terlambat = s.penugasan.filter(p => p.terlambat && p.perintah.tenggat >= sejak && p.perintah.tenggat.getTime() <= now);
    const nilai = await rataNilai(s.id, sejak);
    const bolong = s.penugasan
      .filter(p => [...STATUS_AKTIF, StatusTugas.DISETUJUI].includes(p.status))
      .reduce((n, p) => n + hariBolong(p, p.laporanHarian, sejak).length, 0);
    const alasan: string[] = [];
    if (terlambat.length >= 2) alasan.push(`${terlambat.length}× terlambat dalam 30 hari`);
    if (nilai != null && nilai < 3) alasan.push(`nilai rata-rata ${nilai.toFixed(2)} (< 3) dalam 30 hari`);
    if (bolong >= BATAS_BOLONG) alasan.push(`${bolong} hari kerja tanpa laporan harian dalam 30 hari`);
    if (!alasan.length) continue;
    if (s.teguranDiterima.some(t => t.dibuatPada.getTime() >= now - JEDA_TEGURAN)) continue;
    const n = s.teguranDiterima.length;
    hasil.push({
      staff: { id: s.id, nama: s.nama, jabatan: s.jabatan }, alasan,
      saranTingkat: TINGKAT_TEGURAN[Math.min(n, TINGKAT_TEGURAN.length - 1)], jumlahTeguran: n,
    });
  }
  return hasil;
}

export async function peringkat(divisiId: number) {
  const staff = await db.user.findMany({
    where: { peran: Peran.staff, aktif: true, divisiId },
    include: {
      rewardDiterima: { select: { poin: true, jenis: true } },
      penugasan: { include: { evaluasi: { where: { keputusan: Keputusan.setujui } } } },
    },
  });
  return staff
    .map(s => {
      const evals = s.penugasan.flatMap(p => p.evaluasi);
      return {
        user: s,
        poin: s.rewardDiterima.reduce((a, r) => a + r.poin, 0),
        nilai: rata(evals.map(skorRata)),
        selesai: evals.length,
        sertifikat: s.rewardDiterima.filter(r => r.jenis === JenisReward.sertifikat).length,
      };
    })
    .sort((a, b) => b.poin - a.poin || (b.nilai ?? 0) - (a.nilai ?? 0));
}
