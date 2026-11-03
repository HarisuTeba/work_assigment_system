import Link from 'next/link';
import { StatusPengajar } from '@prisma/client';
import { Layanan, StatusPgj } from '@/components/badges';
import { Form, Submit } from '@/components/Form';
import { konfirmasiPengajar } from '@/app/actions/order';
import { db } from '@/lib/db';
import { tanggalDb } from '@/lib/format';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Penugasan mengajar' };

export default async function PengajarPage() {
  const u = await wajibLogin('pengajar');
  const list = await db.penugasanPengajar.findMany({
    where: { pengajarId: u.id, status: { not: StatusPengajar.USULAN } },
    include: { order: { include: { customer: true, booking: { include: { fasilitas: true } } } } },
    orderBy: { order: { tglMulai: 'asc' } },
  });
  const menunggu = list.filter(p => p.status === StatusPengajar.MENUNGGU);
  const lain = list.filter(p => p.status !== StatusPengajar.MENUNGGU);
  return (
    <>
      <div className="page-head"><h1>Penugasan mengajar</h1></div>
      <section className={`card${menunggu.length ? ' highlight' : ''}`}>
        <div className="card-head"><h2>Perlu konfirmasi</h2></div>
        {!menunggu.length && <p className="empty">Tidak ada penugasan yang menunggu konfirmasi.</p>}
        {menunggu.map(p => (
          <div key={p.id} className="week">
            <div className="week-head"><Layanan j={p.order.jenis} /><strong>{p.order.judul}</strong><span className="small muted">{p.peran}</span></div>
            <p className="small">{p.order.customer.nama} · {tanggalDb(p.order.tglMulai)} – {tanggalDb(p.order.tglSelesai)} · {p.order.lokasi}</p>
            <Form action={konfirmasiPengajar.bind(null, p.id)} className="form-inline">
              <label className="sr-only" htmlFor={`al-${p.id}`}>Alasan bila tidak bersedia</label>
              <input id={`al-${p.id}`} name="alasan" placeholder="Alasan bila tidak bersedia" />
              <Submit name="jawab" value="bersedia">Bersedia</Submit>
              <Submit name="jawab" value="tidak" className="btn btn-danger">Tidak bersedia</Submit>
            </Form>
          </div>
        ))}
      </section>
      <section className="card">
        <div className="card-head"><h2>Jadwal saya</h2></div>
        {!lain.length && <p className="empty">Belum ada.</p>}
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Program</th><th>Tanggal</th><th>Lokasi / ruang</th><th>Status</th><th>Surat Tugas</th></tr></thead>
            <tbody>
              {lain.map(p => (
                <tr key={p.id}>
                  <td><Link href={`/order/${p.orderId}`}><strong>{p.order.judul}</strong></Link><br /><span className="small muted">{p.order.customer.nama} · {p.peran}</span></td>
                  <td className="small">{tanggalDb(p.order.tglMulai)} – {tanggalDb(p.order.tglSelesai)}</td>
                  <td className="small">{p.order.lokasi}{p.order.booking.length ? ` · ${p.order.booking.map(b => b.fasilitas.nama).join(', ')}` : ''}</td>
                  <td><StatusPgj s={p.status} /></td>
                  <td>{p.nomorSuratTugas ? <Link href={`/cetak/surat-tugas/${p.id}`} target="_blank">{p.nomorSuratTugas}</Link> : <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
