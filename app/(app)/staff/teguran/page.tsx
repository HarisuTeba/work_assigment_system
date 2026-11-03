import { Form, Submit } from '@/components/Form';
import { bacaTeguran } from '@/app/actions/tugas';
import { db } from '@/lib/db';
import { waktu } from '@/lib/format';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Teguran saya' };

export default async function TeguranSayaPage() {
  const u = await wajibLogin('staff');
  const list = await db.teguran.findMany({ where: { penerimaId: u.id }, include: { pemberi: true }, orderBy: { dibuatPada: 'desc' } });
  return (
    <>
      <div className="page-head"><h1>Teguran</h1></div>
      <section className="card">
        {!list.length && <p className="empty">Anda belum pernah menerima teguran.</p>}
        <ul className="list">
          {list.map(t => (
            <li key={t.id} className={`list-row col${t.dibacaPada ? '' : ' unread'}`}>
              <span className="row-badges"><span className="status s-teguran">{t.tingkat}</span><span className="small muted">{waktu(t.dibuatPada)} · dari {t.pemberi.nama}</span></span>
              <span><strong>Alasan:</strong> {t.alasan}</span>
              <span><strong>Pembinaan:</strong> {t.catatanPembinaan}</span>
              {t.dibacaPada
                ? <span className="small muted">Dibaca {waktu(t.dibacaPada)}</span>
                : <Form action={bacaTeguran.bind(null, t.id)}><Submit className="btn btn-ghost btn-small">Saya sudah membaca</Submit></Form>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
