import Link from 'next/link';
import { JenisCustomer, JenisLayanan } from '@prisma/client';
import { Form, Submit } from '@/components/Form';
import { buatRfq } from '@/app/actions/order';
import { db } from '@/lib/db';
import { LABEL_CUSTOMER } from '@/lib/format';
import { LAYANAN, type Atribut } from '@/lib/layanan';
import { wajibLogin } from '@/lib/session';
import { ymd } from '@/lib/waktu';

export const metadata = { title: 'RFQ baru' };

function Isian({ jenis, a }: { jenis: JenisLayanan; a: Atribut }) {
  const name = `d_${jenis}_${a.key}`;
  const label = <>{a.label}{!a.wajib && <span className="hint" style={{ display: 'inline' }}> (opsional)</span>}</>;
  if (a.tipe === 'select') {
    return <label>{label}<select name={name} defaultValue=""><option value="" disabled>Pilih</option>{a.opsi!.map(o => <option key={o}>{o}</option>)}</select></label>;
  }
  if (a.tipe === 'textarea') return <label>{label}<textarea name={name} rows={2} /></label>;
  return <label>{label}<input name={name} inputMode={a.tipe === 'number' ? 'numeric' : undefined} />{a.hint && <span className="hint">{a.hint}</span>}</label>;
}

export default async function RfqBaruPage() {
  await wajibLogin('marketing');
  const customer = await db.customer.findMany({ orderBy: { nama: 'asc' } });
  return (
    <>
      <div className="page-head">
        <Link className="back" href="/dasbor">← Dasbor order</Link>
        <h1>Catat RFQ baru</h1>
      </div>
      <section className="card" style={{ maxWidth: 820 }}>
        <Form action={buatRfq} className="stack-lg">
          <fieldset>
            <legend>Customer</legend>
            <label>Customer
              <select name="customerId" defaultValue="" required>
                <option value="" disabled>Pilih customer</option>
                {customer.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
                <option value="baru">+ Customer baru</option>
              </select>
            </label>
            <div className="customer-baru grid-2 tight">
              <label>Nama perusahaan / institusi<input name="cNama" /></label>
              <label>Jenis
                <select name="cJenis" defaultValue={JenisCustomer.SWASTA}>
                  {Object.entries(LABEL_CUSTOMER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label>Nama PIC<input name="cPic" /></label>
              <label>Telepon<input name="cTelepon" /></label>
              <label>Email<input name="cEmail" type="email" /></label>
              <label>Alamat<input name="cAlamat" /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Kebutuhan layanan</legend>
            <label>Jenis layanan
              <select name="jenis" defaultValue={JenisLayanan.TRAINING} required>
                {Object.values(JenisLayanan).map(j => <option key={j} value={j}>{LAYANAN[j].label}</option>)}
              </select>
            </label>
            <label>Judul kebutuhan<input name="judul" required maxLength={150} placeholder="mis. Training IoT untuk teknisi" /></label>
            <label>Deskripsi kebutuhan customer<textarea name="deskripsi" rows={3} required /></label>
            <div className="grid-2 tight">
              <label>Tanggal mulai<input type="date" name="tglMulai" min={ymd()} required /></label>
              <label>Tanggal selesai<input type="date" name="tglSelesai" min={ymd()} required /></label>
              <label>Lokasi<input name="lokasi" required placeholder="In-house customer / Kampus Astratek" /></label>
              <label>Jumlah peserta / pengguna<input type="number" name="jumlahPeserta" min={1} /></label>
            </div>
          </fieldset>

          {Object.values(JenisLayanan).map(j => (
            <fieldset key={j} className={`atribut atribut-${j}`}>
              <legend>Data khusus {LAYANAN[j].label}</legend>
              <div className="grid-2 tight">{LAYANAN[j].atribut.map(a => <Isian key={a.key} jenis={j} a={a} />)}</div>
            </fieldset>
          ))}

          <div className="form-actions start"><Submit>Simpan RFQ</Submit></div>
        </Form>
      </section>
    </>
  );
}
