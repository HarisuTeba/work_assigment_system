import { notFound } from 'next/navigation';
import { peringkat } from '@/lib/logic/evaluasi';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Peringkat' };

export default async function PeringkatPage() {
  const u = await wajibLogin('manager', 'spv', 'staff');
  if (!u.divisiId) notFound();
  const rows = await peringkat(u.divisiId);
  return (
    <>
      <div className="page-head"><h1>Peringkat staff</h1><p className="muted">Divisi {u.divisi?.nama} · berdasarkan total poin</p></div>
      <section className="card">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>#</th><th>Staff</th><th className="num">Poin</th><th className="num">Nilai rata-rata</th><th className="num">Tugas disetujui</th><th className="num">Sertifikat</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.user.id} className={r.user.id === u.id ? 'me' : ''}>
                  <td className="rank">{i + 1}</td>
                  <td><strong>{r.user.nama}</strong><br /><span className="small muted">{r.user.jabatan}</span></td>
                  <td className="num points">{r.poin}</td>
                  <td className="num">{r.nilai != null ? r.nilai.toFixed(2) : '—'}</td>
                  <td className="num">{r.selesai}</td>
                  <td className="num">{r.sertifikat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
