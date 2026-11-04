import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Peran, StatusOrder } from '@prisma/client';
import { Layanan, SlaBadge, Status } from '@/components/badges';
import { PanelAnalisis, Ringkasan, SeksiJadwal, SeksiKomersial, SeksiOperasional, SeksiPenutupan, SeksiSilabus, SeksiSpk } from '@/components/order/Seksi';
import { AlurOrder, AuditTrail } from '@/components/surat';
import { db } from '@/lib/db';
import { ValidasiError } from '@/lib/errors';
import { LIHAT_SEMUA, beranda } from '@/lib/peran';
import { bentrokPengajar } from '@/lib/logic/operasional';
import { hitungSla, orderTerlihat, petaSla } from '@/lib/logic/order';
import { ambilOrder } from '@/lib/queries';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Order' };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await wajibLogin();
  const id = Number((await params).id) || 0;
  try {
    await orderTerlihat(u, id);
  } catch (e) {
    if (e instanceof ValidasiError) notFound();
    throw e;
  }
  const o = (await ambilOrder(id))!;
  const persiapan = o.status === StatusOrder.PERSIAPAN && u.peran === Peran.dps;
  const [units, pengajar, fasilitas, peta] = await Promise.all([
    db.unit.findMany({ orderBy: { nama: 'asc' } }),
    db.pengajar.findMany({ where: { aktif: true }, include: { unit: true }, orderBy: [{ eksternal: 'asc' }, { nama: 'asc' }] }),
    persiapan ? db.fasilitas.findMany({ orderBy: { nama: 'asc' } }) : Promise.resolve([]),
    petaSla(),
  ]);
  // Pengajar internal UPT terkait lebih dulu, lalu eksternal.
  const pengajarUnit = pengajar.filter(p => p.eksternal || p.unitId === o.unitId);
  const bentrok: Record<number, string> = {};
  if (persiapan) {
    for (const p of pengajar) {
      const lain = await bentrokPengajar(p.id, o.tglMulai, o.tglSelesai, o.id);
      if (lain) bentrok[p.id] = lain;
    }
  }
  const kembali = LIHAT_SEMUA.includes(u.peran) ? '/dasbor' : beranda(u.peran);

  return (
    <>
      <div className="page-head">
        <Link className="back" href={kembali}>← Kembali</Link>
        <div className="row-badges"><Layanan j={o.jenis} /><Status s={o.status} /><SlaBadge sla={hitungSla(o, peta)} /></div>
        <h1>{o.judul}</h1>
        <p className="muted">{o.nomorRfq} · {o.customer.nama}</p>
      </div>
      <AlurOrder o={o} />
      <div className="grid-2 wide-left">
        <div className="stack-lg">
          <PanelAnalisis o={o} u={u} units={units} />
          <SeksiSilabus o={o} u={u} units={units} pengajar={pengajarUnit} />
          <SeksiKomersial o={o} u={u} />
          <SeksiSpk o={o} u={u} />
          <SeksiOperasional o={o} u={u} pengajar={pengajar} fasilitas={fasilitas} bentrok={bentrok} />
          <SeksiPenutupan o={o} u={u} />
        </div>
        <div className="stack-lg">
          <Ringkasan o={o} />
          <SeksiJadwal o={o} u={u} />
          <section className="card" aria-labelledby="h-audit">
            <div className="card-head"><h2 id="h-audit">Audit trail</h2></div>
            <AuditTrail o={o} />
          </section>
        </div>
      </div>
    </>
  );
}
