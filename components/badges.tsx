import type { JenisPerintah, Prioritas, StatusDokumen, StatusTugas } from '@prisma/client';
import { LABEL_DOKUMEN, LABEL_PRIORITAS, LABEL_TUGAS, kelasStatus } from '@/lib/format';

export function StatusDok({ s }: { s: StatusDokumen }) {
  return <span className={`status ${kelasStatus(s)}`}>{LABEL_DOKUMEN[s]}</span>;
}

export function StatusTgs({ s }: { s: StatusTugas }) {
  return <span className={`status ${kelasStatus(s)}`}>{LABEL_TUGAS[s]}</span>;
}

export function Prio({ p }: { p: Prioritas }) {
  return <span className={`prio p-${p.toLowerCase()}`}>{LABEL_PRIORITAS[p]}</span>;
}

export function Terlambat({ ya }: { ya: boolean }) {
  return ya ? <span className="status s-terlambat">Terlambat</span> : null;
}

export function Jenis({ j }: { j: JenisPerintah }) {
  return <span className={`jenis j-${j.toLowerCase()}`}>{j}</span>;
}

/** Jumlah tugas aktif dibanding batas KPI; penuh ditandai label, bukan warna saja. */
export function KpiMeter({ aktif, batas }: { aktif: number; batas: number }) {
  const penuh = aktif >= batas;
  return (
    <span className={`kpi${penuh ? ' kpi-penuh' : ''}`} title={`${aktif} dari ${batas} tugas aktif`}>
      <span className="kpi-cells" aria-hidden>
        {Array.from({ length: Math.max(batas, aktif) }, (_, i) => (
          <i key={i} className={i < aktif ? (i >= batas ? 'over' : 'on') : ''} />
        ))}
      </span>
      <span className="num">{aktif}/{batas}</span>
      {penuh && <span className="kpi-label">{aktif > batas ? 'Melebihi KPI' : 'Penuh'}</span>}
    </span>
  );
}

export function Progres({ persen }: { persen: number }) {
  return (
    <span className="progress-cell">
      <span className="progress" aria-hidden><span className="progress-fill" style={{ width: `${persen}%`, display: 'block' }} /></span>
      <span className="num small">{persen}%</span>
    </span>
  );
}
