import Link from 'next/link';
import { Keputusan } from '@prisma/client';
import { db } from '@/lib/db';
import { waktu } from '@/lib/format';
import { skorRata } from '@/lib/logic/aturan';
import { rataNilai, totalPoin } from '@/lib/logic/evaluasi';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Nilai & reward' };

export default async function NilaiPage() {
  const u = await wajibLogin('staff');
  const [poin, nilai, evaluasi, reward] = await Promise.all([
    totalPoin(u.id),
    rataNilai(u.id),
    db.evaluasi.findMany({ where: { penugasan: { staffId: u.id } }, include: { penugasan: { include: { perintah: true } } }, orderBy: { dibuatPada: 'desc' } }),
    db.reward.findMany({ where: { penerimaId: u.id }, include: { pemberi: true }, orderBy: { dibuatPada: 'desc' } }),
  ]);
  return (
    <>
      <div className="page-head"><h1>Nilai & reward</h1></div>
      <div className="stats">
        <div className="stat"><div className="stat-label">Total poin</div><div className="stat-value">{poin}</div></div>
        <div className="stat"><div className="stat-label">Nilai rata-rata</div><div className="stat-value">{nilai != null ? nilai.toFixed(2) : '—'}<span className="stat-sub"> / 5</span></div></div>
        <div className="stat"><div className="stat-label">Tugas disetujui</div><div className="stat-value">{evaluasi.filter(e => e.keputusan === Keputusan.setujui).length}</div></div>
        <div className="stat"><div className="stat-label">Sertifikat</div><div className="stat-value">{reward.filter(r => r.jenis === 'sertifikat').length}</div></div>
      </div>
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Evaluasi</h2></div>
          {!evaluasi.length && <p className="empty">Belum ada evaluasi.</p>}
          <ul className="list">
            {evaluasi.map(e => (
              <li key={e.id} className="list-row">
                <Link className="grow" href={`/staff/tugas/${e.penugasanId}`}><strong>{e.penugasan.perintah.judul}</strong><br /><span className="small muted">{waktu(e.dibuatPada)}</span></Link>
                <span className={`status ${e.keputusan === 'setujui' ? 's-disetujui' : 's-revisi'}`}>{e.keputusan === 'setujui' ? 'Disetujui' : 'Revisi'}</span>
                <span className="score-num">{skorRata(e).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <div className="card-head"><h2>Reward</h2></div>
          {!reward.length && <p className="empty">Belum ada reward.</p>}
          <ul className="list">
            {reward.map(r => (
              <li key={r.id} className="list-row">
                <span className="grow">{r.pesan}<br /><span className="small muted">{waktu(r.dibuatPada)} · {r.pemberi.nama}</span></span>
                <span className="points">{r.jenis === 'sertifikat' ? 'Sertifikat' : `+${r.poin}`}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
