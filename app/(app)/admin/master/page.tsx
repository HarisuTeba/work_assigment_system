import { JenisCustomer, JenisFasilitas, StatusOrder } from '@prisma/client';
import { Form, Submit } from '@/components/Form';
import { simpanCustomer, simpanFasilitas, simpanPengajar, simpanSla, simpanUnit } from '@/app/actions/akun';
import { db } from '@/lib/db';
import { LABEL_CUSTOMER, LABEL_STATUS } from '@/lib/format';
import { SLA_DEFAULT } from '@/lib/logic/aturan';
import { petaSla } from '@/lib/logic/order';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Data master & SLA' };

const LABEL_FASILITAS: Record<JenisFasilitas, string> = { RUANG_KELAS: 'Ruang kelas', LABORATORIUM: 'Laboratorium', AULA: 'Aula' };

export default async function MasterPage() {
  await wajibLogin('admin');
  const [units, customer, fasilitas, peta, pengajar] = await Promise.all([
    db.unit.findMany({ orderBy: { nama: 'asc' } }),
    db.customer.findMany({ orderBy: { nama: 'asc' }, include: { _count: { select: { orders: true } } } }),
    db.fasilitas.findMany({ orderBy: { nama: 'asc' } }),
    petaSla(),
    db.pengajar.findMany({ include: { unit: true }, orderBy: [{ eksternal: 'asc' }, { nama: 'asc' }] }),
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
        <div className="card-head"><h2>Pengajar</h2><span className="small muted">tidak login; kesediaan dicatat DPS</span></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Nama</th><th>Jabatan / keahlian</th><th>UPT / Prodi</th><th>Telepon</th><th>Aktif</th><th /></tr></thead>
            <tbody>
              {pengajar.map(p => (
                <tr key={p.id} className={p.aktif ? '' : 'inactive'}>
                  <td colSpan={6}>
                    <Form action={simpanPengajar.bind(null, p.id)} className="form-inline pengajar-row">
                      <input name="nama" defaultValue={p.nama} aria-label="Nama" required />
                      <input name="jabatan" defaultValue={p.jabatan} aria-label="Jabatan" required />
                      <select name="unitId" defaultValue={p.unitId ?? ''} aria-label="UPT/Prodi">
                        <option value="">— Eksternal —</option>
                        {units.map(x => <option key={x.id} value={x.id}>{x.nama}</option>)}
                      </select>
                      <input name="telepon" defaultValue={p.telepon ?? ''} aria-label="Telepon" />
                      <label className="check"><input type="checkbox" name="eksternal" defaultChecked={p.eksternal} /> Eksternal</label>
                      <label className="check"><input type="checkbox" name="aktif" defaultChecked={p.aktif} /> Aktif</label>
                      <Submit className="btn btn-ghost btn-small">Simpan</Submit>
                    </Form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Form action={simpanPengajar.bind(null, null)} className="form-inline pengajar-row" reset>
          <input name="nama" placeholder="Nama pengajar baru" aria-label="Nama pengajar baru" required />
          <input name="jabatan" placeholder="Jabatan / keahlian" aria-label="Jabatan" required />
          <select name="unitId" defaultValue="" aria-label="UPT/Prodi">
            <option value="">— Eksternal —</option>
            {units.map(x => <option key={x.id} value={x.id}>{x.nama}</option>)}
          </select>
          <input name="telepon" placeholder="Telepon" aria-label="Telepon" />
          <label className="check"><input type="checkbox" name="eksternal" /> Eksternal</label>
          <Submit className="btn btn-ghost">Tambah</Submit>
        </Form>
      </section>

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
