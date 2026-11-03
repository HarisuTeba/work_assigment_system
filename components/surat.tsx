import { StatusOrder } from '@prisma/client';
import { LABEL_STATUS, namaTampil, waktu } from '@/lib/format';
import type { OrderLengkap } from '@/lib/queries';

export function Lampiran({ nama, label }: { nama: string | null | undefined; label?: string }) {
  if (!nama) return <span className="muted">—</span>;
  return <a className="attach" href={`/berkas/${encodeURIComponent(nama)}`} target="_blank" rel="noopener">{label ?? namaTampil(nama)}</a>;
}

/** Enam kelompok tahap yang ditampilkan di dasbor dan halaman order (RFQ → BAST). */
export const KELOMPOK: { label: string; status: StatusOrder[] }[] = [
  { label: 'RFQ', status: [StatusOrder.RFQ] },
  { label: 'Silabus & RAK', status: [StatusOrder.SILABUS_RAK] },
  { label: 'Quotation & PO', status: [StatusOrder.QUOTATION] },
  { label: 'SPK & approval', status: [StatusOrder.SPK_DRAF, StatusOrder.APPROVAL_1, StatusOrder.APPROVAL_2] },
  { label: 'Eksekusi', status: [StatusOrder.PERSIAPAN, StatusOrder.PELAKSANAAN] },
  { label: 'BAST', status: [StatusOrder.LAPORAN, StatusOrder.SELESAI] },
];

/** Posisi order dalam alur; order tertutup (tidak sanggup/batal) ditandai pada kelompok terakhirnya. */
export function AlurOrder({ o }: { o: Pick<OrderLengkap, 'status' | 'riwayat'> }) {
  const tutup = o.status === StatusOrder.DITOLAK || o.status === StatusOrder.BATAL;
  const efektif = tutup ? (o.riwayat.at(-1)?.dari ?? StatusOrder.RFQ) : o.status;
  const posisi = KELOMPOK.findIndex(k => k.status.includes(efektif));
  const selesai = o.status === StatusOrder.SELESAI;
  return (
    <ol className="alur" aria-label="Tahap order">
      {KELOMPOK.map((k, i) => {
        const kelas = tutup && i === posisi ? 'bad' : selesai || i < posisi ? 'done' : i === posisi ? 'now' : '';
        return (
          <li key={k.label} className={kelas} aria-current={i === posisi ? 'step' : undefined}>
            {k.label}
            {i === posisi && <small>{LABEL_STATUS[o.status]}</small>}
          </li>
        );
      })}
    </ol>
  );
}

/** Audit trail seluruh keputusan dan perpindahan tahap. */
export function AuditTrail({ o }: { o: Pick<OrderLengkap, 'riwayat'> }) {
  return (
    <ul className="riwayat">
      {o.riwayat.map(r => (
        <li key={r.id}>
          <time>{waktu(r.dibuatPada)}</time>
          <span>
            <strong>{r.oleh.nama}</strong>{' '}
            {r.dari !== r.ke && <span className={r.ke === 'DITOLAK' || r.ke === 'BATAL' || (r.catatan ?? '').startsWith('Ditolak') ? 'bad' : ''}>→ {LABEL_STATUS[r.ke]}</span>}
            {r.catatan && <> — {r.catatan}</>}
          </span>
        </li>
      ))}
    </ul>
  );
}
