import Link from 'next/link';
import { Peran, StatusDokumen, StatusTugas } from '@prisma/client';
import { db } from '@/lib/db';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Ringkasan Admin' };

export default async function AdminPage() {
  await wajibLogin('admin');
  const [divisi, perPeran, perintah, tugasAktif] = await Promise.all([
    db.divisi.findMany({ orderBy: { nama: 'asc' }, include: { _count: { select: { users: true, perintah: true } } } }),
    db.user.groupBy({ by: ['peran'], where: { aktif: true }, _count: true }),
    db.perintahKerja.count({ where: { status: { in: [StatusDokumen.DISAHKAN, StatusDokumen.DITURUNKAN] } } }),
    db.penugasan.count({ where: { status: { in: [StatusTugas.DITERIMA, StatusTugas.DIKERJAKAN, StatusTugas.REVISI] } } }),
  ]);
  const jml = (p: Peran) => perPeran.find(x => x.peran === p)?._count ?? 0;
  return (
    <>
      <div className="page-head"><h1>Ringkasan sistem</h1></div>
      <div className="stats">
        <Link className="stat" href="/admin/divisi"><div className="stat-label">Divisi</div><div className="stat-value">{divisi.length}</div></Link>
        <Link className="stat" href="/admin/pengguna"><div className="stat-label">Manager · SPV</div><div className="stat-value">{jml(Peran.manager)} · {jml(Peran.spv)}</div></Link>
        <Link className="stat" href="/admin/pengguna"><div className="stat-label">Staff aktif</div><div className="stat-value">{jml(Peran.staff)}</div></Link>
        <div className="stat"><div className="stat-label">Perintah sah</div><div className="stat-value">{perintah}</div></div>
        <div className="stat"><div className="stat-label">Tugas dikerjakan</div><div className="stat-value">{tugasAktif}</div></div>
      </div>
      <section className="card">
        <div className="card-head"><h2>Divisi</h2><Link href="/admin/divisi">Kelola divisi</Link></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Kode</th><th>Divisi</th><th className="num">Anggota</th><th className="num">ISPK/SPK</th></tr></thead>
            <tbody>
              {divisi.map(d => (
                <tr key={d.id}><td><code>{d.kode}</code></td><td>{d.nama}</td><td className="num">{d._count.users}</td><td className="num">{d._count.perintah}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
