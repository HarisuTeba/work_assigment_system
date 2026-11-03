import Link from 'next/link';
import { Peran, StatusOrder } from '@prisma/client';
import { Layanan, SlaBadge } from '@/components/badges';
import { db } from '@/lib/db';
import { rupiah, tanggalDb, waktu } from '@/lib/format';
import { hitungSla, petaSla } from '@/lib/logic/order';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Antrean approval' };

/** Antrean approval SPK; dibuat ringkas agar nyaman dibuka dari ponsel (mobile-friendly approval). */
export default async function ApprovalPage() {
  const u = await wajibLogin('kadep_marketing', 'kadep_dps');
  const tahap = u.peran === Peran.kadep_marketing ? StatusOrder.APPROVAL_1 : StatusOrder.APPROVAL_2;
  const [antre, riwayat, peta] = await Promise.all([
    db.order.findMany({ where: { status: tahap }, include: { customer: true, spk: true, marketing: true }, orderBy: { tahapMulai: 'asc' } }),
    db.spk.findMany({
      where: u.peran === Peran.kadep_marketing ? { approval1Id: u.id } : { approval2Id: u.id },
      include: { order: { include: { customer: true } } }, orderBy: { dibuatPada: 'desc' }, take: 10,
    }),
    petaSla(),
  ]);
  return (
    <>
      <div className="page-head">
        <h1>Antrean approval</h1>
        <p className="muted">{u.peran === Peran.kadep_marketing ? 'Approval 1 — kesesuaian komersial dan nilai transaksi' : 'Approval 2 — kesiapan operasional, pengajar, dan fasilitas'}</p>
      </div>
      <section className={`card${antre.length ? ' highlight' : ''}`}>
        <div className="card-head"><h2>Menunggu persetujuan Anda</h2><span className="small muted">{antre.length} SPK</span></div>
        {!antre.length && <p className="empty">Tidak ada SPK yang menunggu.</p>}
        <ul className="list">
          {antre.map(o => (
            <li key={o.id} className="list-row approval-row">
              <Layanan j={o.jenis} />
              <Link className="grow" href={`/order/${o.id}#h-spk`}>
                <strong>{o.judul}</strong><br />
                <span className="small muted">{o.customer.nama} · {rupiah(o.spk?.nilaiKontrak)} · {tanggalDb(o.tglMulai)} · oleh {o.marketing.nama}</span>
              </Link>
              <SlaBadge sla={hitungSla(o, peta)} />
              <Link className="btn btn-primary btn-small" href={`/order/${o.id}#h-spk`}>Tinjau</Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="card">
        <div className="card-head"><h2>Terakhir Anda setujui</h2></div>
        {!riwayat.length && <p className="empty">Belum ada.</p>}
        <ul className="list">
          {riwayat.map(s => (
            <li key={s.id} className="list-row">
              <Link className="grow" href={`/order/${s.orderId}`}><strong>{s.order.judul}</strong><br /><span className="small muted">{s.order.customer.nama} · {s.nomor ?? 'menunggu approval 2'}</span></Link>
              <span className="small muted">{waktu(u.peran === Peran.kadep_marketing ? s.approval1Pada : s.approval2Pada)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
