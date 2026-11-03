import Link from 'next/link';
import { StatusDokumen } from '@prisma/client';
import { Jenis, Prio } from '@/components/badges';
import { DaftarPica } from '@/components/TabelRekap';
import { db } from '@/lib/db';
import { rupiah, waktu } from '@/lib/format';
import { picaTerbukaDivisi, rekapDivisi } from '@/lib/logic/rekap';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Ringkasan Manager' };

export default async function ManagerPage() {
  const u = await wajibLogin('manager');
  const divisiId = u.divisiId!;
  const [menunggu, rekap, pica, sah] = await Promise.all([
    db.perintahKerja.findMany({ where: { divisiId, status: StatusDokumen.MENUNGGU_PENGESAHAN }, include: { spv: true }, orderBy: { diajukanPada: 'asc' } }),
    rekapDivisi(divisiId),
    picaTerbukaDivisi(divisiId),
    db.perintahKerja.count({ where: { divisiId, status: { in: [StatusDokumen.DISAHKAN, StatusDokumen.DITURUNKAN] } } }),
  ]);
  const penuh = rekap.filter(r => r.aktif >= r.batas).length;
  const terlambat = rekap.reduce((a, r) => a + r.terlambat, 0);

  return (
    <>
      <div className="page-head"><h1>Selamat datang, {u.nama.split(' ')[0]}</h1><p className="muted">Manager {u.divisi?.nama}</p></div>
      <div className="stats">
        <Link className="stat" href="/manager/pengesahan"><div className="stat-label">Menunggu pengesahan</div><div className="stat-value">{menunggu.length}</div></Link>
        <div className="stat"><div className="stat-label">Perintah sah</div><div className="stat-value">{sah}</div></div>
        <Link className="stat" href="/manager/rekap"><div className="stat-label">Staff KPI penuh</div><div className="stat-value">{penuh}<span className="stat-sub"> / {rekap.length}</span></div></Link>
        <Link className="stat" href="/manager/rekap"><div className="stat-label">PICA terbuka</div><div className="stat-value">{pica.length}</div></Link>
        <div className="stat"><div className="stat-label">Terlambat (30 hari)</div><div className="stat-value">{terlambat}</div></div>
      </div>
      <div className="grid-2">
        <section className={`card${menunggu.length ? ' highlight' : ''}`}>
          <div className="card-head"><h2>Perlu disahkan</h2><Link href="/manager/pengesahan">Semua</Link></div>
          {!menunggu.length && <p className="empty">Tidak ada dokumen yang menunggu.</p>}
          <ul className="list">
            {menunggu.map(p => (
              <li key={p.id} className="list-row">
                <Jenis j={p.jenis} />
                <Link className="grow" href={`/manager/pengesahan/${p.id}`}>
                  <strong>{p.judul}</strong><br />
                  <span className="small muted">{p.spv.nama} · diajukan {waktu(p.diajukanPada)}{p.nilaiPo ? ` · ${rupiah(p.nilaiPo)}` : ''}</span>
                </Link>
                <Prio p={p.prioritas} />
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <div className="card-head"><h2>PICA terbuka</h2><Link href="/manager/rekap">Rekap</Link></div>
          <DaftarPica list={pica.slice(0, 5)} href={id => `/manager/penugasan/${id}`} />
        </section>
      </div>
    </>
  );
}
