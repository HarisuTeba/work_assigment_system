import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DOKUMEN_BISA_DIUBAH } from '@/lib/logic/perintah';
import { ambilPerintah } from '@/lib/queries';
import { wajibLogin } from '@/lib/session';
import { FormPerintah } from '../../FormPerintah';

export const metadata = { title: 'Ubah perintah kerja' };

export default async function UbahPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await wajibLogin('spv');
  const pr = await ambilPerintah(Number((await params).id) || 0);
  if (!pr || pr.spvId !== u.id) notFound();
  if (!DOKUMEN_BISA_DIUBAH.includes(pr.status)) redirect(`/spv/perintah/${pr.id}`);
  return (
    <>
      <div className="page-head">
        <Link className="back" href={`/spv/perintah/${pr.id}`}>← Kembali ke surat</Link>
        <h1>{pr.status === 'DITOLAK' ? 'Revisi perintah kerja' : 'Ubah draf'}</h1>
      </div>
      {pr.alasanTolak && <p className="banner bad"><strong>Alasan penolakan Manager:</strong>{pr.alasanTolak}</p>}
      <section className="card" style={{ maxWidth: 780 }}><FormPerintah pr={pr} /></section>
    </>
  );
}
