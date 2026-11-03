import Link from 'next/link';
import { StatusOrder, StatusPengajar, StatusPp } from '@prisma/client';
import { Layanan, Peringatan, Status, StatusPgj } from '@/components/badges';
import { db } from '@/lib/db';
import { LABEL_PP, tanggalDb } from '@/lib/format';
import { ppMepet } from '@/lib/logic/operasional';
import { wajibLogin } from '@/lib/session';
import { hariIni } from '@/lib/waktu';

export const metadata = { title: 'Jadwal & operasional' };

/** Ringkasan DPS: program mendatang beserta kesiapan pengajar, PP, dan fasilitas. */
export default async function OperasionalPage() {
  await wajibLogin('dps', 'kadep_dps');
  const [program, pp] = await Promise.all([
    db.order.findMany({
      where: { status: { in: [StatusOrder.PERSIAPAN, StatusOrder.PELAKSANAAN] } },
      include: { customer: true, pengajar: { where: { status: { not: StatusPengajar.USULAN } }, include: { pengajar: true } }, booking: { include: { fasilitas: true } }, pp: true },
      orderBy: { tglMulai: 'asc' },
    }),
    db.purchaseRequest.findMany({ where: { status: { not: StatusPp.DITERIMA } }, include: { order: true }, orderBy: { order: { tglMulai: 'asc' } } }),
  ]);
  const hari = hariIni();
  return (
    <>
      <div className="page-head"><h1>Jadwal & operasional</h1></div>
      <section className="card">
        <div className="card-head"><h2>Program persiapan & berjalan</h2></div>
        {!program.length && <p className="empty">Tidak ada program.</p>}
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Program</th><th>Tanggal</th><th>Pengajar</th><th>Fasilitas</th><th>PP</th><th>Tahap</th></tr></thead>
            <tbody>
              {program.map(o => {
                const ppBelum = o.pp.filter(p => p.status !== StatusPp.DITERIMA).length;
                return (
                  <tr key={o.id}>
                    <td><Layanan j={o.jenis} /> <Link href={`/order/${o.id}`}><strong>{o.judul}</strong></Link><br /><span className="small muted">{o.customer.nama}</span></td>
                    <td className="small">{tanggalDb(o.tglMulai)} – {tanggalDb(o.tglSelesai)}{o.tglMulai < hari && o.status === 'PERSIAPAN' && <><br /><Peringatan>Lewat tanggal mulai</Peringatan></>}</td>
                    <td className="small">{o.pengajar.length ? o.pengajar.map(p => <div key={p.id}>{p.pengajar.nama} <StatusPgj s={p.status} /></div>) : <Peringatan>Belum ada</Peringatan>}</td>
                    <td className="small">{o.booking.map(b => b.fasilitas.nama).join(', ') || <span className="muted">—</span>}</td>
                    <td className="small">{o.pp.length ? `${o.pp.length - ppBelum}/${o.pp.length} diterima` : '—'}</td>
                    <td><Status s={o.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <div className="card-head"><h2>PP belum diterima</h2><span className="small muted">lead time ideal 14 hari sebelum pelaksanaan</span></div>
        {!pp.length && <p className="empty">Semua PP sudah diterima.</p>}
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Barang</th><th>Program</th><th>Pelaksanaan</th><th>Status</th></tr></thead>
            <tbody>
              {pp.map(p => (
                <tr key={p.id}>
                  <td>{p.item} <span className="small muted">({p.jumlah} {p.satuan})</span></td>
                  <td><Link href={`/order/${p.orderId}`}>{p.order.judul}</Link></td>
                  <td className="small">{tanggalDb(p.order.tglMulai)} {ppMepet(p.dibuatPada, p.order.tglMulai) && <Peringatan>Diajukan &lt; 14 hari</Peringatan>}</td>
                  <td>{LABEL_PP[p.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
