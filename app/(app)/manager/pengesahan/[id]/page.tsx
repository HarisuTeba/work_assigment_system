import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusDokumen } from '@prisma/client';
import { Form, Submit } from '@/components/Form';
import { AlurDokumen, Memo, RiwayatPengesahan } from '@/components/surat';
import { TabelPenugasan } from '@/components/TabelPenugasan';
import { sahkanPerintah, tolakPerintah } from '@/app/actions/perintah';
import { db } from '@/lib/db';
import { ambilPerintah, includeRingkas } from '@/lib/queries';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Tinjau perintah kerja' };

export default async function TinjauPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await wajibLogin('manager');
  const pr = await ambilPerintah(Number((await params).id) || 0);
  if (!pr || pr.divisiId !== u.divisiId || pr.status === StatusDokumen.DRAF) notFound();
  const penugasan = await db.penugasan.findMany({ where: { perintahId: pr.id }, include: includeRingkas });
  const menunggu = pr.status === StatusDokumen.MENUNGGU_PENGESAHAN;

  return (
    <>
      <div className="page-head"><Link className="back" href="/manager/pengesahan">← Pengesahan</Link></div>
      <AlurDokumen pr={pr} />
      <div className="grid-2 wide-left">
        <Memo pr={pr} />
        <div className="stack-lg">
          {menunggu && (
            <section className="card highlight" aria-labelledby="h-putus">
              <div className="card-head"><h2 id="h-putus">Keputusan Manager</h2></div>
              <Form action={sahkanPerintah.bind(null, pr.id)} className="stack" confirm="Sahkan perintah kerja ini? Nomor resmi akan diterbitkan.">
                <label>Catatan pengesahan (opsional)<textarea name="catatan" rows={2} /></label>
                <div className="form-actions start"><Submit>Sahkan & terbitkan nomor</Submit></div>
              </Form>
              <hr className="sep" />
              <Form action={tolakPerintah.bind(null, pr.id)} className="stack">
                <label>Alasan penolakan<textarea name="alasan" rows={3} required placeholder="Apa yang harus diperbaiki SPV?" /><span className="hint">Wajib diisi; dikirim ke SPV untuk revisi.</span></label>
                <div className="form-actions start"><Submit className="btn btn-danger">Tolak & kembalikan ke SPV</Submit></div>
              </Form>
            </section>
          )}
          {pr.status === StatusDokumen.DITOLAK && <p className="banner bad"><strong>Ditolak:</strong>{pr.alasanTolak}</p>}
          <section className="card">
            <div className="card-head"><h2>Riwayat pengesahan</h2></div>
            <RiwayatPengesahan pr={pr} />
          </section>
        </div>
      </div>
      {penugasan.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>Pelaksanaan oleh staff</h2></div>
          <TabelPenugasan list={penugasan} href={id => `/manager/penugasan/${id}`} judul={false} />
        </section>
      )}
    </>
  );
}
