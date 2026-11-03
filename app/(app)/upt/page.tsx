import { StatusOrder } from '@prisma/client';
import { TabelOrder } from '@/components/TabelOrder';
import { db } from '@/lib/db';
import { petaSla } from '@/lib/logic/order';
import { includeRingkas } from '@/lib/queries';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Request Silabus & RAK' };

export default async function UptPage() {
  const u = await wajibLogin('upt');
  const [masuk, lain, peta] = await Promise.all([
    db.order.findMany({ where: { unitId: u.unitId, status: StatusOrder.SILABUS_RAK, silabus: { diteruskanPada: { not: null } } }, include: includeRingkas, orderBy: { tahapMulai: 'asc' } }),
    db.order.findMany({ where: { unitId: u.unitId, NOT: { status: StatusOrder.SILABUS_RAK }, silabus: { dikirimPada: { not: null } } }, include: includeRingkas, orderBy: { createdAt: 'desc' }, take: 20 }),
    petaSla(),
  ]);
  return (
    <>
      <div className="page-head"><h1>Request Silabus & RAK</h1><p className="muted">{u.unit?.nama}</p></div>
      <section className={`card${masuk.length ? ' highlight' : ''}`}>
        <div className="card-head"><h2>Perlu disusun</h2><span className="small muted">Silabus/RPS, RAK, dan usulan pengajar</span></div>
        <TabelOrder list={masuk} peta={peta} kosong="Tidak ada request yang menunggu." />
      </section>
      <section className="card">
        <div className="card-head"><h2>Sudah dikirim</h2></div>
        <TabelOrder list={lain} peta={peta} kosong="Belum ada." />
      </section>
    </>
  );
}
