import Link from 'next/link';
import { StatusDokumen, StatusTugas } from '@prisma/client';
import { Jenis, StatusDok } from '@/components/badges';
import { TabelRekap } from '@/components/TabelRekap';
import { db } from '@/lib/db';
import { waktu } from '@/lib/format';
import { saranTeguran } from '@/lib/logic/evaluasi';
import { rekapDivisi } from '@/lib/logic/rekap';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Ringkasan SPV' };

export default async function SpvPage() {
  const u = await wajibLogin('spv');
  const [dokumen, tanya, laporan, rekap, saran] = await Promise.all([
    db.perintahKerja.findMany({
      where: { spvId: u.id, status: { in: [StatusDokumen.DITOLAK, StatusDokumen.DISAHKAN, StatusDokumen.MENUNGGU_PENGESAHAN] } },
      orderBy: { updatedAt: 'desc' },
    }),
    db.pertanyaan.count({ where: { jawaban: null, penugasan: { perintah: { spvId: u.id } } } }),
    db.penugasan.count({ where: { status: StatusTugas.DILAPORKAN, perintah: { spvId: u.id } } }),
    rekapDivisi(u.divisiId!),
    saranTeguran(u),
  ]);
  const pica = rekap.reduce((a, r) => a + r.picaOpen, 0);
  const ditolak = dokumen.filter(d => d.status === StatusDokumen.DITOLAK).length;

  return (
    <>
      <div className="page-head">
        <div className="row-badges" style={{ justifyContent: 'space-between' }}>
          <h1>Selamat datang, {u.nama.split(' ')[0]}</h1>
          <Link className="btn btn-primary" href="/spv/perintah/baru">Terbitkan perintah kerja</Link>
        </div>
      </div>
      <div className="stats">
        <Link className="stat" href="/spv/perintah?status=DITOLAK"><div className="stat-label">Ditolak Manager</div><div className="stat-value">{ditolak}</div></Link>
        <Link className="stat" href="/spv/penugasan"><div className="stat-label">Pertanyaan staff</div><div className="stat-value">{tanya}</div></Link>
        <Link className="stat" href="/spv/penugasan"><div className="stat-label">Laporan akhir masuk</div><div className="stat-value">{laporan}</div></Link>
        <Link className="stat" href="/spv/penugasan"><div className="stat-label">PICA terbuka</div><div className="stat-value">{pica}</div></Link>
        <Link className="stat" href="/spv/teguran"><div className="stat-label">Saran teguran</div><div className="stat-value">{saran.length}</div></Link>
      </div>
      <section className="card">
        <div className="card-head"><h2>Dokumen dalam proses</h2><Link href="/spv/perintah">Semua ISPK & SPK</Link></div>
        {!dokumen.length && <p className="empty">Tidak ada dokumen yang sedang diproses.</p>}
        <ul className="list">
          {dokumen.map(d => (
            <li key={d.id} className="list-row">
              <Jenis j={d.jenis} />
              <Link className="grow" href={`/spv/perintah/${d.id}`}>
                <strong>{d.judul}</strong><br />
                <span className="small muted">
                  {d.status === StatusDokumen.DISAHKAN ? `${d.nomor} · siap diturunkan ke staff` : d.status === StatusDokumen.DITOLAK ? `Alasan: ${d.alasanTolak}` : `Diajukan ${waktu(d.diajukanPada)}`}
                </span>
              </Link>
              <StatusDok s={d.status} />
            </li>
          ))}
        </ul>
      </section>
      <section className="card">
        <div className="card-head"><h2>Beban kerja staff divisi</h2></div>
        <TabelRekap rows={rekap} />
      </section>
    </>
  );
}
