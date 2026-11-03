import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetailPenugasan } from '@/components/DetailPenugasan';
import { ambilPenugasan } from '@/lib/queries';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Penugasan staff' };

export default async function SpvPenugasanPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await wajibLogin('spv');
  const p = await ambilPenugasan(Number((await params).id) || 0);
  if (!p || p.perintah.spvId !== u.id) notFound();
  return (
    <>
      <div className="page-head">
        <Link className="back" href={`/spv/perintah/${p.perintahId}`}>← {p.perintah.nomor}</Link>
        <h1>{p.staff.nama}</h1>
      </div>
      <DetailPenugasan p={p} mode="spv" />
    </>
  );
}
