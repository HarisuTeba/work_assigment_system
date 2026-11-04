import Link from 'next/link';
import { Peran } from '@prisma/client';
import { Form, Submit } from '@/components/Form';
import { setAktif } from '@/app/actions/akun';
import { db } from '@/lib/db';
import { LABEL_PERAN } from '@/lib/format';
import { wajibLogin } from '@/lib/session';
import { FormUser } from './FormUser';

export const metadata = { title: 'Pengguna' };

const URUT = Object.values(Peran);

export default async function AdminPage() {
  const admin = await wajibLogin('admin');
  const [users, units] = await Promise.all([
    db.user.findMany({ include: { unit: true }, orderBy: { nama: 'asc' } }),
    db.unit.findMany({ orderBy: { nama: 'asc' } }),
  ]);
  users.sort((a, b) => URUT.indexOf(a.peran) - URUT.indexOf(b.peran));
  return (
    <>
      <div className="page-head"><h1>Pengguna</h1></div>
      <section className="card">
        <div className="card-head"><h2>Semua akun</h2><span className="small muted">{users.length} akun</span></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Nama</th><th>Peran</th><th>UPT / Prodi</th><th>Status</th><th className="actions">Aksi</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={u.aktif ? '' : 'inactive'}>
                  <td><strong>{u.nama}</strong><br /><span className="small muted">{u.username} · {u.jabatan}</span></td>
                  <td>{LABEL_PERAN[u.peran]}</td>
                  <td>{u.unit?.nama ?? '—'}</td>
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
        <div style={{ maxWidth: 640 }}><FormUser units={units} /></div>
      </details>
    </>
  );
}
