import { redirect } from 'next/navigation';
import { wajibLogin } from '@/lib/session';

export default async function Beranda() {
  const u = await wajibLogin();
  redirect(`/${u.peran}`);
}
