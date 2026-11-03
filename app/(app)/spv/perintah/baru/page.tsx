import Link from 'next/link';
import { wajibLogin } from '@/lib/session';
import { FormPerintah } from '../FormPerintah';

export const metadata = { title: 'Terbitkan perintah kerja' };

export default async function BaruPage() {
  await wajibLogin('spv');
  return (
    <>
      <div className="page-head">
        <Link className="back" href="/spv/perintah">← ISPK & SPK</Link>
        <h1>Terbitkan perintah kerja</h1>
        <p className="muted">Perintah dikirim ke Manager divisi untuk disahkan sebelum diturunkan ke staff.</p>
      </div>
      <section className="card" style={{ maxWidth: 780 }}><FormPerintah /></section>
    </>
  );
}
