import Link from 'next/link';
import { Peran } from '@prisma/client';
import { KpiMeter } from '@/components/badges';
import { Form, Submit } from '@/components/Form';
import { setAktif } from '@/app/actions/akun';
import { db } from '@/lib/db';
import { LABEL_PERAN } from '@/lib/format';
import { STATUS_AKTIF } from '@/lib/logic/aturan';
import { wajibLogin } from '@/lib/session';
import { FormUser } from './FormUser';

export const metadata = { title: 'Pengguna & KPI' };

const URUT: Peran[] = [Peran.admin, Peran.manager, Peran.spv, Peran.staff];

export default async function PenggunaPage() {
  const admin = await wajibLogin('admin');
  const [users, divisi] = await Promise.all([
    db.user.findMany({
      include: { divisi: true, penugasan: { where: { status: { in: STATUS_AKTIF } }, select: { id: true } } },
      orderBy: [{ divisiId: 'asc' }, { nama: 'asc' }],
    }),
    db.divisi.findMany({ orderBy: { nama: 'asc' } }),
  ]);
  users.sort((a, b) => URUT.indexOf(a.peran) - URUT.indexOf(b.peran));
  return (
    <>
      <div className="page-head"><h1>Pengguna & KPI</h1></div>
      <section className="card">
        <div className="card-head"><h2>Semua akun</h2><span className="small muted">{users.length} akun</span></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Nama</th><th>Peran</th><th>Divisi</th><th>KPI tugas aktif</th><th>Status</th><th className="actions">Aksi</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={u.aktif ? '' : 'inactive'}>
                  <td><strong>{u.nama}</strong><br /><span className="small muted">{u.username} · {u.jabatan}</span></td>
                  <td>{LABEL_PERAN[u.peran]}</td>
                  <td>{u.divisi?.nama ?? '—'}</td>
                  <td>{u.peran === Peran.staff ? <KpiMeter aktif={u.penugasan.length} batas={u.batasTugasAktif} /> : <span className="muted">—</span>}</td>
                  <td><span className={`status ${u.aktif ? 's-aktif' : 's-nonaktif'}`}>{u.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td className="actions">
                    <Link className="btn btn-ghost btn-small" href={`/admin/pengguna/${u.id}`}>Ubah</Link>{' '}
                    {u.id !== admin.id && (
                      <Form action={setAktif.bind(null, u.id, !u.aktif)}>
                        <Submit className={`btn btn-small ${u.aktif ? 'btn-danger' : 'btn-ghost'}`}>{u.aktif ? 'Nonaktifkan' : 'Aktifkan'}</Submit>
                      </Form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <details className="card">
        <summary>Tambah pengguna</summary>
        <div style={{ maxWidth: 640 }}><FormUser divisi={divisi} /></div>
      </details>
    </>
  );
}
