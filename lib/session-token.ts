import { SignJWT, jwtVerify } from 'jose';
import type { Peran } from '@prisma/client';

// Dipakai middleware (edge) dan server; jangan impor Prisma di sini.
export const COOKIE = 'spk_sesi';
export const UMUR_SESI = 60 * 60 * 8; // 8 jam kerja

export type Token = { uid: number; peran: Peran };

function kunci() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET minimal 32 karakter (lihat .env.example).');
  return new TextEncoder().encode(s);
}

export async function buatToken(t: Token): Promise<string> {
  return new SignJWT(t).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${UMUR_SESI}s`).sign(kunci());
}

export async function bacaToken(token: string | undefined): Promise<Token | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, kunci());
    return { uid: Number(payload.uid), peran: payload.peran as Peran };
  } catch {
    return null;
  }
}
