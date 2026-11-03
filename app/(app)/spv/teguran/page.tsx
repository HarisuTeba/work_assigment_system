import { Peran } from '@prisma/client';
import { Form, Submit } from '@/components/Form';
import { beriTeguran } from '@/app/actions/tugas';
import { db } from '@/lib/db';
import { waktu } from '@/lib/format';
import { TINGKAT_TEGURAN } from '@/lib/logic/aturan';
import { saranTeguran } from '@/lib/logic/evaluasi';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Teguran' };

export default async function TeguranPage({ searchParams }: { searchParams: Promise<{ staff?: string; tingkat?: string }> }) {
  const u = await wajibLogin('spv');
  const q = await searchParams;
  const [staff, saran, riwayat] = await Promise.all([
    db.user.findMany({ where: { peran: Peran.staff, aktif: true, divisiId: u.divisiId }, orderBy: { nama: 'asc' } }),
    saranTeguran(u),
    db.teguran.findMany({ where: { penerima: { divisiId: u.divisiId } }, include: { penerima: true, pemberi: true }, orderBy: { dibuatPada: 'desc' } }),
  ]);
  const pilihan = saran.find(s => String(s.staff.id) === q.staff);

  return (
    <>
      <div className="page-head"><h1>Teguran</h1><p className="muted">Sistem hanya memberi saran; keputusan dan isi teguran tetap di tangan SPV.</p></div>
      <section className={`card${saran.length ? ' alert-card' : ''}`}>
        <div className="card-head"><h2>Saran sistem</h2><span className="small muted">terlambat ≥ 2×, nilai &lt; 3, atau ≥ 3 hari tanpa laporan harian (30 hari)</span></div>
        {!saran.length && <p className="empty">Tidak ada staff yang perlu dipertimbangkan.</p>}
        <ul className="list">
          {saran.map(s => (
            <li key={s.staff.id} className="list-row">
              <div className="grow">
                <strong>{s.staff.nama}</strong> <span className="small muted">{s.staff.jabatan} · {s.jumlahTeguran} teguran sebelumnya</span>
                <ul className="small" style={{ margin: '4px 0 0', paddingLeft: '1.1rem' }}>{s.alasan.map(a => <li key={a}>{a}</li>)}</ul>
              </div>
              <span className="status s-teguran">Saran {s.saranTingkat}</span>
              <a className="btn btn-ghost btn-small" href={`/spv/teguran?staff=${s.staff.id}&tingkat=${s.saranTingkat}#form-teguran`}>Pertimbangkan</a>
            </li>
          ))}
        </ul>
      </section>
      <div className="grid-2 wide-left">
        <section className="card">
          <div className="card-head"><h2>Riwayat teguran</h2></div>
          {!riwayat.length && <p className="empty">Belum ada teguran.</p>}
          <ul className="list">
            {riwayat.map(t => (
              <li key={t.id} className="list-row col">
                <span className="row-badges"><span className="status s-teguran">{t.tingkat}</span><strong>{t.penerima.nama}</strong><span className="small muted">{waktu(t.dibuatPada)} · {t.pemberi.nama}</span></span>
                <span>{t.alasan}</span>
                <span className="small muted">Pembinaan: {t.catatanPembinaan}</span>
                <span className="small">{t.dibacaPada ? `Dibaca ${waktu(t.dibacaPada)}` : 'Belum dibaca'}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card highlight" id="form-teguran">
          <div className="card-head"><h2>Beri teguran</h2></div>
          <Form action={beriTeguran} className="stack" reset>
            <label>Staff
              <select name="staffId" required defaultValue={pilihan ? pilihan.staff.id : ''}>
                <option value="" disabled>Pilih staff</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </label>
            <label>Tingkat
              <select name="tingkat" required defaultValue={q.tingkat && (TINGKAT_TEGURAN as readonly string[]).includes(q.tingkat) ? q.tingkat : 'Lisan'}>
                {TINGKAT_TEGURAN.map(t => <option key={t} value={t}>{t === 'Lisan' ? 'Teguran lisan' : t}</option>)}
              </select>
            </label>
            <label>Alasan<textarea name="alasan" rows={3} required defaultValue={pilihan ? pilihan.alasan.join('; ') : ''} /></label>
            <label>Catatan pembinaan<textarea name="catatanPembinaan" rows={3} required placeholder="Langkah perbaikan yang disepakati" /></label>
            <div className="form-actions start"><Submit className="btn btn-danger">Berikan teguran</Submit></div>
          </Form>
        </section>
      </div>
    </>
  );
}
