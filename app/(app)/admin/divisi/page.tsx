import { Form, Submit } from '@/components/Form';
import { hapusDivisi, simpanDivisi } from '@/app/actions/akun';
import { db } from '@/lib/db';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Divisi' };

export default async function DivisiPage() {
  await wajibLogin('admin');
  const divisi = await db.divisi.findMany({ orderBy: { nama: 'asc' }, include: { _count: { select: { users: true } } } });
  return (
    <>
      <div className="page-head"><h1>Divisi</h1><p className="muted">Kode divisi dipakai pada nomor ISPK/SPK, mis. SPK/001/<strong>PMS</strong>/X/2026.</p></div>
      <div className="grid-2 wide-left">
        <section className="card">
          <div className="card-head"><h2>Daftar divisi</h2></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Kode</th><th>Nama</th><th className="num">Anggota</th><th className="actions">Aksi</th></tr></thead>
              <tbody>
                {divisi.map(d => (
                  <tr key={d.id}>
                    <td colSpan={3}>
                      <Form action={simpanDivisi.bind(null, d.id)} className="form-inline">
                        <label className="sr-only" htmlFor={`k-${d.id}`}>Kode</label>
                        <input id={`k-${d.id}`} name="kode" defaultValue={d.kode} style={{ maxWidth: '6rem' }} required />
                        <label className="sr-only" htmlFor={`n-${d.id}`}>Nama</label>
                        <input id={`n-${d.id}`} name="nama" defaultValue={d.nama} required />
                        <span className="num small muted" style={{ alignSelf: 'center', minWidth: '4rem', textAlign: 'right' }}>{d._count.users} orang</span>
                        <Submit className="btn btn-ghost btn-small">Simpan</Submit>
                      </Form>
                    </td>
                    <td className="actions">
                      <Form action={hapusDivisi.bind(null, d.id)} confirm={`Hapus divisi ${d.nama}?`}>
                        <Submit className="btn btn-danger btn-small">Hapus</Submit>
                      </Form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <div className="card-head"><h2>Tambah divisi</h2></div>
          <Form action={simpanDivisi.bind(null, null)} className="stack" reset>
            <label>Kode<input name="kode" required maxLength={6} placeholder="mis. HRD" /><span className="hint">2–6 huruf kapital</span></label>
            <label>Nama divisi<input name="nama" required maxLength={100} /></label>
            <div className="form-actions start"><Submit>Tambah</Submit></div>
          </Form>
        </section>
      </div>
    </>
  );
}
