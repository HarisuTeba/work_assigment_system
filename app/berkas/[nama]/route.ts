import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { penggunaSaatIni } from '@/lib/session';
import { DIR_UPLOAD, TIPE } from '@/lib/upload';
import { namaTampil } from '@/lib/format';

// Lampiran hanya bisa dibuka pengguna yang sudah login.
export async function GET(_: Request, { params }: { params: Promise<{ nama: string }> }) {
  if (!(await penggunaSaatIni())) return new Response('Silakan login.', { status: 401 });
  const nama = path.basename(decodeURIComponent((await params).nama));
  const tipe = TIPE[path.extname(nama).toLowerCase()];
  if (!tipe) return new Response('Tidak ditemukan.', { status: 404 });
  try {
    const isi = await readFile(path.join(DIR_UPLOAD, nama));
    return new Response(new Uint8Array(isi), {
      headers: {
        'Content-Type': tipe,
        'Content-Disposition': `inline; filename="${namaTampil(nama).replace(/"/g, '')}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Tidak ditemukan.', { status: 404 });
  }
}
