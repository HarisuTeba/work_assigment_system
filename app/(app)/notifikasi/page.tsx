import { Form, Submit } from '@/components/Form';
import { bacaSemuaNotif } from '@/app/actions/akun';
import { db } from '@/lib/db';
import { waktu } from '@/lib/format';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Notifikasi' };

export default async function NotifikasiPage() {
  const u = await wajibLogin();
  const list = await db.notifikasi.findMany({ where: { userId: u.id }, orderBy: { dibuatPada: 'desc' }, take: 100 });
  const belum = list.filter(n => !n.dibaca).length;
  return (
    <>
      <div className="page-head"><h1>Notifikasi</h1></div>
      <section className="card">
        <div className="card-head">
          <h2>{belum ? `${belum} belum dibaca` : 'Semua sudah dibaca'}</h2>
          {belum > 0 && <Form action={bacaSemuaNotif}><Submit className="btn-text">Tandai semua dibaca</Submit></Form>}
        </div>
        {!list.length && <p className="empty">Belum ada notifikasi.</p>}
        <ul className="notif-list">
          {list.map(n => (
            <li key={n.id} className={n.dibaca ? '' : 'unread'}>
              <a href={`/notif/${n.id}`}><span>{n.pesan}</span><span className="small muted">{waktu(n.dibuatPada)}</span></a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
