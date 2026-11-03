import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { ValidasiError } from './errors';

/** Hasil Server Action untuk ditampilkan oleh <Form>. `t` membuat pesan sama tetap dianggap baru. */
export type Hasil = { ok?: string; error?: string; t: number } | null;

/** Jalankan aturan bisnis; kesalahan validasi menjadi pesan, sukses me-refresh halaman. */
export async function jalankan(fn: () => Promise<unknown>, ok: string, ke?: string | ((r: unknown) => string)): Promise<Hasil> {
  let r: unknown;
  try {
    r = await fn();
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ValidasiError) return { error: e.message, t: Date.now() };
    console.error(e);
    return { error: 'Terjadi kesalahan sistem. Coba lagi.', t: Date.now() };
  }
  revalidatePath('/', 'layout');
  if (ke) redirect(typeof ke === 'function' ? ke(r) : ke);
  return { ok, t: Date.now() };
}

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? '');
