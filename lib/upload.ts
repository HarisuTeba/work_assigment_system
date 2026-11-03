import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gagal } from './errors';
import { BATAS_LAMPIRAN } from './logic/aturan';

export const DIR_UPLOAD = path.join(process.cwd(), 'storage', 'uploads');
export const TIPE: Record<string, string> = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

/** Simpan lampiran dari form; null bila tidak ada berkas. Nama asli disimpan setelah "__". */
export async function simpanBerkas(v: FormDataEntryValue | null): Promise<string | null> {
  if (!(v instanceof File) || v.size === 0) return null;
  const ext = path.extname(v.name).toLowerCase();
  if (!TIPE[ext]) gagal('Lampiran harus PDF, JPG, atau PNG.');
  if (v.size > BATAS_LAMPIRAN) gagal('Lampiran maksimal 2 MB.');
  const asli = path.basename(v.name, ext).replace(/[^\w.-]+/g, '_').slice(0, 60) || 'lampiran';
  const nama = `${randomUUID()}__${asli}${ext}`;
  await mkdir(DIR_UPLOAD, { recursive: true });
  await writeFile(path.join(DIR_UPLOAD, nama), Buffer.from(await v.arrayBuffer()));
  return nama;
}

