import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Peran } from '@prisma/client';
import { db } from './db';
import { COOKIE, UMUR_SESI, bacaToken, buatToken } from './session-token';

export async function mulaiSesi(uid: number, peran: Peran) {
  (await cookies()).set(COOKIE, await buatToken({ uid, peran }), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: UMUR_SESI,
  });
}

export async function akhiriSesi() {
  (await cookies()).delete(COOKIE);
}

/** Pengguna yang sedang login (sekali query per request), atau null. */
export const penggunaSaatIni = cache(async () => {
  const t = await bacaToken((await cookies()).get(COOKIE)?.value);
  if (!t) return null;
  const u = await db.user.findUnique({ where: { id: t.uid }, include: { divisi: true } });
  return u && u.aktif ? u : null;
});

export type Pengguna = NonNullable<Awaited<ReturnType<typeof penggunaSaatIni>>>;

/** Wajib login (dan peran tertentu bila diberikan); jika tidak, kembali ke login/beranda. */
export async function wajibLogin(...peran: Peran[]): Promise<Pengguna> {
  const u = await penggunaSaatIni();
  if (!u) redirect('/login');
  if (peran.length && !peran.includes(u.peran)) redirect(`/${u.peran}`);
  return u;
}
