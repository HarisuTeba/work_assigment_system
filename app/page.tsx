import { redirect } from 'next/navigation';
import { beranda } from '@/lib/peran';
import { wajibLogin } from '@/lib/session';

export default async function Beranda() {
  const u = await wajibLogin();
  redirect(beranda(u.peran));
}
