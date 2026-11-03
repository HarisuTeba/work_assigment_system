import { StatusTugas } from '@prisma/client';
import { Progres, StatusTgs, Terlambat } from './badges';
import { ActionPlan, LaporanAkhir, LaporanHarian, LaporanMingguan, ThreadTanya, type Mode } from './laporan';
import { Memo } from './surat';
import { waktu } from '@/lib/format';
import { persenAp } from '@/lib/logic/laporan';
import type { PenugasanLengkap } from '@/lib/queries';

/** Halaman kerja satu penugasan: surat, garis waktu, tanya-jawab, AP, laporan harian/mingguan, laporan akhir. */
export function DetailPenugasan({ p, mode, atas }: { p: PenugasanLengkap; mode: Mode; atas?: React.ReactNode }) {
  const mulaiKerja = !([StatusTugas.MENUNGGU_RESPON, StatusTugas.MENUNGGU_JAWABAN, StatusTugas.DITOLAK_STAFF] as StatusTugas[]).includes(p.status);
  return (
    <>
      <div className="person-head">
        <StatusTgs s={p.status} />
        <Terlambat ya={p.terlambat} />
        {p.diAtasKpi && <span className="kpi-label">Diterima di atas KPI</span>}
        {mulaiKerja && <Progres persen={persenAp(p.actionPlan)} />}
      </div>
      <div className="timeline">
        <span>Diturunkan<strong>{waktu(p.dibuatPada)}</strong></span>
        <span>Diterima<strong>{waktu(p.diterimaPada)}</strong></span>
        <span>Laporan akhir<strong>{waktu(p.dilaporkanPada)}</strong></span>
        <span>Tenggat<strong>{waktu(p.perintah.tenggat)}</strong></span>
      </div>
      {p.status === StatusTugas.DITOLAK_STAFF && <p className="banner bad"><strong>Ditolak staff:</strong>{p.alasanTolak}</p>}
      {p.status === StatusTugas.REVISI && p.evaluasi.at(-1)?.umpanBalik && (
        <p className="banner warn"><strong>Perlu revisi:</strong>{p.evaluasi.at(-1)!.umpanBalik}</p>
      )}
      {atas}
      <div className="grid-2 wide-left">
        <Memo pr={p.perintah} kepada={`${p.staff.nama} · ${p.staff.jabatan}`} tag="h2" />
        <div className="stack-lg">
          <ThreadTanya p={p} mode={mode} />
          {mulaiKerja && <ActionPlan p={p} mode={mode} />}
        </div>
      </div>
      {mulaiKerja && (
        <>
          <LaporanHarian p={p} mode={mode} />
          <div className="grid-2">
            <LaporanMingguan p={p} mode={mode} />
            <LaporanAkhir p={p} mode={mode} />
          </div>
        </>
      )}
    </>
  );
}
