import Link from 'next/link';
import { StatusDokumen } from '@prisma/client';
import { Jenis, Prio, StatusDok } from '@/components/badges';
import { db } from '@/lib/db';
import { LABEL_DOKUMEN, waktu } from '@/lib/format';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'ISPK & SPK' };

export default async function DaftarPerintahPage({ searchParams }: { searchParams: Promise<{ status?: string; jenis?: string }> }) {
  const u = await wajibLogin('spv');
  const q = await searchParams;
  const status = q.status && q.status in StatusDokumen ? (q.status as StatusDokumen) : undefined;
  const jenis = q.jenis === 'ISPK' || q.jenis === 'SPK' ? q.jenis : undefined;
  const [list, hitung] = await Promise.all([
    db.perintahKerja.findMany({
      where: { spvId: u.id, ...(status ? { status } : {}), ...(jenis ? { jenis } : {}) },
      orderBy: { updatedAt: 'desc' },
      include: { penugasan: { select: { status: true } } },
    }),
    db.perintahKerja.groupBy({ by: ['status'], where: { spvId: u.id }, _count: true }),
  ]);
  const n = (s: StatusDokumen) => hitung.find(h => h.status === s)?._count ?? 0;
  const link = (s?: StatusDokumen) => `/spv/perintah${s ? `?status=${s}` : ''}`;

  return (
    <>
      <div className="page-head">
        <div className="row-badges" style={{ justifyContent: 'space-between' }}>
          <h1>ISPK & SPK</h1>
          <Link className="btn btn-primary" href="/spv/perintah/baru">Terbitkan perintah kerja</Link>
        </div>
      </div>
      <nav className="stats" aria-label="Saring status">
        <Link className="stat" href={link()} aria-current={!status ? 'page' : undefined}><div className="stat-label">Semua</div><div className="stat-value">{hitung.reduce((a, h) => a + h._count, 0)}</div></Link>
        {Object.values(StatusDokumen).map(s => (
          <Link key={s} className="stat" href={link(s)} aria-current={status === s ? 'page' : undefined}>
            <div className="stat-label">{LABEL_DOKUMEN[s]}</div><div className="stat-value">{n(s)}</div>
          </Link>
        ))}
      </nav>
      <section className="card">
        <div className="card-head"><h2>{status ? LABEL_DOKUMEN[status] : 'Semua perintah'}</h2></div>
        {!list.length && <p className="empty">Tidak ada perintah kerja.</p>}
        {list.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Jenis</th><th>Nomor · Judul</th><th>Status</th><th>Prioritas</th><th>Tenggat</th><th className="num">Staff</th></tr></thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id}>
                    <td><Jenis j={p.jenis} /></td>
                    <td>
                      <Link href={`/spv/perintah/${p.id}`}><strong>{p.judul}</strong></Link><br />
                      <span className="small muted">{p.nomor ?? 'Belum bernomor'}{p.klien ? ` · ${p.klien}` : ''}</span>
                    </td>
                    <td><StatusDok s={p.status} />{p.status === StatusDokumen.DITOLAK && <div className="small muted">Perlu revisi</div>}</td>
                    <td><Prio p={p.prioritas} /></td>
                    <td className="small">{waktu(p.tenggat)}</td>
                    <td className="num">{p.penugasan.length || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
