import type { JenisLayanan, StatusOrder, StatusPengajar } from '@prisma/client';
import { LABEL_PENGAJAR, LABEL_STATUS, kelasStatus, sisaWaktu } from '@/lib/format';
import { LAYANAN } from '@/lib/layanan';
import type { Sla } from '@/lib/logic/order';

export function Status({ s }: { s: StatusOrder }) {
  return <span className={`status ${kelasStatus(s)}`}>{LABEL_STATUS[s]}</span>;
}

export function Layanan({ j }: { j: JenisLayanan }) {
  return <span className="jenis" title={LAYANAN[j].label}>{LAYANAN[j].kode}</span>;
}

/** Indikator SLA: label + bentuk (lingkaran aman, segitiga mendekati, kotak tegas lewat). */
export function SlaBadge({ sla }: { sla: Sla }) {
  if (!sla) return null;
  const label = { aman: 'Aman', dekat: 'Mendekati batas', lewat: 'Lewat SLA' }[sla.keadaan];
  return (
    <span className={`sla sla-${sla.keadaan}`} title={`Batas tahap: ${sla.batas.toLocaleDateString('id-ID')}`}>
      {label} <span className="sla-sisa">· {sisaWaktu(sla.batas)}</span>
    </span>
  );
}

export function StatusPgj({ s }: { s: StatusPengajar }) {
  return <span className={`status ${kelasStatus('p_' + s)}`}>{LABEL_PENGAJAR[s]}</span>;
}

export function Peringatan({ children }: { children: React.ReactNode }) {
  return <span className="status s-terlambat">{children}</span>;
}
