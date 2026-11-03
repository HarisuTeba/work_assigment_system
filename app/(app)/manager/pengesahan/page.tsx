import Link from 'next/link';
import { StatusDokumen } from '@prisma/client';
import { Jenis, Prio, StatusDok } from '@/components/badges';
import { db } from '@/lib/db';
import { rupiah, waktu } from '@/lib/format';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Pengesahan' };

export default async function PengesahanPage() {
  const u = await wajibLogin('manager');
  const list = await db.perintahKerja.findMany({
    where: { divisiId: u.divisiId!, status: { not: StatusDokumen.DRAF } },
    include: { spv: true, penugasan: { select: { id: true } } },
    orderBy: [{ diajukanPada: 'desc' }],
  });
  const menunggu = list.filter(p => p.status === StatusDokumen.MENUNGGU_PENGESAHAN);
  const lain = list.filter(p => p.status !== StatusDokumen.MENUNGGU_PENGESAHAN);

  const Tabel = ({ rows }: { rows: typeof list }) => (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Jenis</th><th>Judul</th><th>SPV</th><th>Nilai PO</th><th>Prioritas</th><th>Diajukan</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.id}>
              <td><Jenis j={p.jenis} /></td>
              <td><Link href={`/manager/pengesahan/${p.id}`}><strong>{p.judul}</strong></Link><br /><span className="small muted">{p.nomor ?? 'Belum bernomor'}{p.klien ? ` · ${p.klien}` : ''}</span></td>
              <td>{p.spv.nama}</td>
              <td className="num small">{p.nilaiPo ? rupiah(p.nilaiPo) : '—'}</td>
              <td><Prio p={p.prioritas} /></td>
              <td className="small">{waktu(p.diajukanPada)}</td>
              <td><StatusDok s={p.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="page-head"><h1>Pengesahan ISPK & SPK</h1><p className="muted">Divisi {u.divisi?.nama}</p></div>
      <section className={`card${menunggu.length ? ' highlight' : ''}`}>
        <div className="card-head"><h2>Menunggu pengesahan</h2><span className="small muted">{menunggu.length} dokumen</span></div>
        {menunggu.length ? <Tabel rows={menunggu} /> : <p className="empty">Tidak ada dokumen yang menunggu.</p>}
      </section>
      <section className="card">
        <div className="card-head"><h2>Sudah diputuskan</h2></div>
        {lain.length ? <Tabel rows={lain} /> : <p className="empty">Belum ada.</p>}
      </section>
    </>
  );
}
