import { StatusTugas } from '@prisma/client';
import { TabelPenugasan } from '@/components/TabelPenugasan';
import { db } from '@/lib/db';
import { STATUS_KERJA } from '@/lib/logic/aturan';
import { includeRingkas, picaTerbuka } from '@/lib/queries';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Penugasan staff' };

export default async function DaftarPenugasanPage() {
  const u = await wajibLogin('spv');
  const semua = await db.penugasan.findMany({
    where: { perintah: { spvId: u.id } },
    include: includeRingkas,
    orderBy: [{ perintah: { tenggat: 'asc' } }],
  });
  const perlu = semua.filter(p => p.status === StatusTugas.DILAPORKAN || p.pertanyaan.length > 0 || picaTerbuka(p) > 0);
  const respon = semua.filter(p => p.status === StatusTugas.MENUNGGU_RESPON || p.status === StatusTugas.MENUNGGU_JAWABAN);
  const kerja = semua.filter(p => STATUS_KERJA.includes(p.status));
  const selesai = semua.filter(p => p.status === StatusTugas.DISETUJUI || p.status === StatusTugas.DITOLAK_STAFF);
  const href = (id: number) => `/spv/penugasan/${id}`;

  return (
    <>
      <div className="page-head"><h1>Penugasan staff</h1></div>
      <section className={`card${perlu.length ? ' highlight' : ''}`}>
        <div className="card-head"><h2>Perlu tindakan Anda</h2><span className="small muted">pertanyaan, PICA open, laporan akhir</span></div>
        {perlu.length ? <TabelPenugasan list={perlu} href={href} /> : <p className="empty">Tidak ada yang menunggu.</p>}
      </section>
      <section className="card">
        <div className="card-head"><h2>Menunggu respons staff</h2></div>
        <TabelPenugasan list={respon} href={href} />
      </section>
      <section className="card">
        <div className="card-head"><h2>Sedang dikerjakan</h2></div>
        <TabelPenugasan list={kerja} href={href} />
      </section>
      <details className="card">
        <summary>Selesai & ditolak ({selesai.length})</summary>
        <TabelPenugasan list={selesai} href={href} />
      </details>
    </>
  );
}
