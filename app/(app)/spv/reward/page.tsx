import { Peran } from '@prisma/client';
import { Form, Submit } from '@/components/Form';
import { beriReward } from '@/app/actions/tugas';
import { db } from '@/lib/db';
import { waktu } from '@/lib/format';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Reward' };

const JENIS = { otomatis: 'Poin evaluasi', pujian: 'Pujian', sertifikat: 'Sertifikat' } as const;

export default async function RewardPage() {
  const u = await wajibLogin('spv');
  const [staff, riwayat] = await Promise.all([
    db.user.findMany({ where: { peran: Peran.staff, aktif: true, divisiId: u.divisiId }, orderBy: { nama: 'asc' } }),
    db.reward.findMany({ where: { penerima: { divisiId: u.divisiId } }, include: { penerima: true, pemberi: true }, orderBy: { dibuatPada: 'desc' }, take: 50 }),
  ]);
  return (
    <>
      <div className="page-head"><h1>Reward</h1><p className="muted">Poin evaluasi diberikan otomatis saat laporan akhir disetujui: rata-rata skor × 10, +10 bila tepat waktu.</p></div>
      <div className="grid-2 wide-left">
        <section className="card">
          <div className="card-head"><h2>Riwayat reward divisi</h2></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Waktu</th><th>Staff</th><th>Jenis</th><th>Pesan</th><th className="num">Poin</th></tr></thead>
              <tbody>
                {riwayat.map(r => (
                  <tr key={r.id}>
                    <td className="small">{waktu(r.dibuatPada)}</td>
                    <td>{r.penerima.nama}</td>
                    <td>{JENIS[r.jenis]}</td>
                    <td className="small">{r.pesan}</td>
                    <td className="num points">{r.poin ? `+${r.poin}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card highlight">
          <div className="card-head"><h2>Beri apresiasi</h2></div>
          <Form action={beriReward} className="stack" reset>
            <label>Staff
              <select name="staffId" required defaultValue="">
                <option value="" disabled>Pilih staff</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </label>
            <fieldset>
              <legend>Jenis</legend>
              <label className="radio"><input type="radio" name="jenis" value="pujian" required defaultChecked /> Pujian (+0–20 poin)</label>
              <label className="radio"><input type="radio" name="jenis" value="sertifikat" /> Sertifikat Karyawan Teladan</label>
            </fieldset>
            <label>Poin bonus pujian<input type="number" name="poin" min={0} max={20} defaultValue={5} /></label>
            <label>Pesan apresiasi<textarea name="pesan" rows={3} required maxLength={255} /></label>
            <div className="form-actions start"><Submit>Berikan</Submit></div>
          </Form>
        </section>
      </div>
    </>
  );
}
