import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { wajibLogin } from '@/lib/session';
import { FormUser } from '../FormUser';

export const metadata = { title: 'Ubah pengguna' };

export default async function UbahPenggunaPage({ params }: { params: Promise<{ id: string }> }) {
  await wajibLogin('admin');
  const user = await db.user.findUnique({ where: { id: Number((await params).id) || 0 } });
  if (!user) notFound();
  const divisi = await db.divisi.findMany({ orderBy: { nama: 'asc' } });
  return (
    <>
      <div className="page-head"><Link className="back" href="/admin/pengguna">← Pengguna</Link><h1>Ubah {user.nama}</h1></div>
      <section className="card" style={{ maxWidth: 640 }}><FormUser user={user} divisi={divisi} /></section>
    </>
  );
}
