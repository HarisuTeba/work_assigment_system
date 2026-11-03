// Kesalahan yang pesannya aman ditampilkan ke pengguna.
export class ValidasiError extends Error {}

export function gagal(pesan: string): never {
  throw new ValidasiError(pesan);
}

export function teks(v: unknown): string {
  return String(v ?? '').trim();
}

export function wajib(v: unknown, label: string): string {
  const t = teks(v);
  if (!t) gagal(`${label} wajib diisi.`);
  return t;
}

export function rata(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}
