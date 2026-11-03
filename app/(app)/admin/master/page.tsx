import { JenisCustomer, JenisFasilitas, StatusOrder } from '@prisma/client';
import { Form, Submit } from '@/components/Form';
import { simpanCustomer, simpanFasilitas, simpanSla, simpanUnit } from '@/app/actions/akun';
import { db } from '@/lib/db';
import { LABEL_CUSTOMER, LABEL_STATUS } from '@/lib/format';
import { SLA_DEFAULT } from '@/lib/logic/aturan';
import { petaSla } from '@/lib/logic/order';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Data master & SLA' };

const LABEL_FASILITAS: Record<JenisFasilitas, string> = { RUANG_KELAS: 'Ruang kelas', LABORATORIUM: 'Laboratorium', AULA: 'Aula' };

export default async function MasterPage() {
  await wajibLogin('admin');
  const [units, customer, fasilitas, peta] = await Promise.all([
    db.unit.findMany({ orderBy: { nama: 'asc' } }),
    db.customer.findMany({ orderBy: { nama: 'asc' }, include: { _count: { select: { orders: true } } } }),
    db.fasilitas.findMany({ orderBy: { nama: 'asc' } }),
    petaSla(),
  ]);
  return (
    <>
      <div className="page-head"><h1>Data master & SLA</h1></div>
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Batas waktu tahap (SLA)</h2></div>
          <Form action={simpanSla} className="stack">
            {(Object.keys(SLA_DEFAULT) as StatusOrder[]).map(s => (
              <label key={s} className="form-inline" style={{ alignItems: 'center' }}>
                <span className="grow">{LABEL_STATUS[s]}</span>
                <input type="number" name={`sla_${s}`} min={1} max={60} defaultValue={peta[s]} style={{ width: '5rem' }} aria-label={`SLA ${LABEL_STATUS[s]} (hari)`} />
                <span className="small muted">hari</span>
              </label>
            ))}
            <p className="hint">Persiapan dibatasi tanggal mulai program; pelaksanaan dibatasi tanggal selesai + 1 hari.</p>
            <div className="form-actions start"><Submit>Simpan SLA</Submit></div>
          </Form>
        </section>
        <section className="card">
          <div className="card-head"><h2>UPT / Prodi</h2></div>
          <ul className="list">
            {units.map(x => (
              <li key={x.id} className="list-row">
                <Form action={simpanUnit.bind(null, x.id)} className="form-inline grow">
                  <input name="kode" defaultValue={x.kode} aria-label="Kode" style={{ maxWidth: '5.5rem' }} required />
                  <input name="nama" defaultValue={x.nama} aria-label="Nama" required />
                  <Submit className="btn btn-ghost btn-small">Simpan</Submit>
                </Form>
              </li>
            ))}
          </ul>
          <Form action={simpanUnit.bind(null, null)} className="form-inline" reset>
            <input name="kode" placeholder="Kode" aria-label="Kode baru" style={{ maxWidth: '5.5rem' }} required />
            <input name="nama" placeholder="Nama UPT/Prodi baru" aria-label="Nama baru" required />
            <Submit className="btn btn-ghost">Tambah</Submit>
          </Form>
        </section>
      </div>

      <section className="card">
        <div className="card-head"><h2>Fasilitas (ruang & lab)</h2></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Nama</th><th>Jenis</th><th>Kapasitas</th><th /></tr></thead>
            <tbody>
              {fasilitas.map(f => (
                <tr key={f.id}>
                  <td colSpan={4}>
                    <Form action={simpanFasilitas.bind(null, f.id)} className="form-inline">
                      <input name="nama" defaultValue={f.nama} aria-label="Nama" required />
                      <select name="jenis" defaultValue={f.jenis} aria-label="Jenis">{Object.entries(LABEL_FASILITAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                      <input name="kapasitas" type="number" min={1} defaultValue={f.kapasitas} aria-label="Kapasitas" style={{ width: '6rem' }} />
                      <Submit className="btn btn-ghost btn-small">Simpan</Submit>
                    </Form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Form action={simpanFasilitas.bind(null, null)} className="form-inline" reset>
          <input name="nama" placeholder="Nama fasilitas baru" aria-label="Nama fasilitas baru" required />
          <select name="jenis" defaultValue={JenisFasilitas.RUANG_KELAS} aria-label="Jenis">{Object.entries(LABEL_FASILITAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input name="kapasitas" type="number" min={1} placeholder="Kapasitas" aria-label="Kapasitas" style={{ width: '7rem' }} required />
          <Submit className="btn btn-ghost">Tambah</Submit>
        </Form>
      </section>

      <section className="card">
        <div className="card-head"><h2>Customer</h2><span className="small muted">{customer.length} customer</span></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Nama</th><th>Jenis</th><th>PIC</th><th>Kontak</th><th className="num">Order</th></tr></thead>
            <tbody>
              {customer.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.nama}</strong></td><td>{LABEL_CUSTOMER[c.jenis]}</td><td>{c.pic}</td>
                  <td className="small">{[c.telepon, c.email].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="num">{c._count.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details>
          <summary className="small">Tambah customer</summary>
          <Form action={simpanCustomer.bind(null, null)} className="grid-2 tight" reset>
            <label>Nama<input name="nama" required /></label>
            <label>Jenis<select name="jenis" defaultValue={JenisCustomer.SWASTA}>{Object.entries(LABEL_CUSTOMER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>PIC<input name="pic" required /></label>
            <label>Telepon<input name="telepon" /></label>
            <label>Email<input name="email" type="email" /></label>
            <label>Alamat<input name="alamat" /></label>
            <div className="form-actions start"><Submit>Tambah customer</Submit></div>
          </Form>
        </details>
      </section>
    </>
  );
}
