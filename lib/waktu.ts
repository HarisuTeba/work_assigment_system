// Semua tanggal ditampilkan dan dihitung dalam zona Asia/Jakarta.
export const ZONA = 'Asia/Jakarta';
export const HARI = 86_400_000;

/** Tanggal kalender Jakarta (YYYY-MM-DD) dari sebuah waktu. */
export function ymd(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Kolom @db.Date disimpan sebagai tengah malam UTC dari tanggal kalendernya. */
export function tanggalDb(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

export function hariIni(): Date {
  return tanggalDb(ymd());
}

/** Waktu lokal Jakarta "YYYY-MM-DDTHH:mm" (input datetime-local) → Date. */
export function dariInputLokal(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return null;
  return new Date(`${s}:00+07:00`);
}

export function keInputLokal(d: Date): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d);
  const v = (t: string) => p.find(x => x.type === t)!.value;
  return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}`;
}

/** Minggu ISO dari tanggal kalender, mis. "2026-W44". */
export function mingguIso(s: string = ymd()): string {
  const d = tanggalDb(s);
  const hari = (d.getUTCDay() + 6) % 7; // Senin = 0
  d.setUTCDate(d.getUTCDate() - hari + 3); // Kamis di minggu yang sama
  const tahun = d.getUTCFullYear();
  const kamisPertama = new Date(Date.UTC(tahun, 0, 4));
  const minggu = 1 + Math.round(((d.getTime() - kamisPertama.getTime()) / HARI - 3 + ((kamisPertama.getUTCDay() + 6) % 7)) / 7);
  return `${tahun}-W${String(minggu).padStart(2, '0')}`;
}

/** Senin dan Jumat dari minggu ISO, untuk label rentang. */
export function rentangMinggu(minggu: string): [Date, Date] {
  const [t, w] = minggu.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(t, 0, 4));
  const senin = new Date(jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * HARI + (w - 1) * 7 * HARI);
  return [senin, new Date(senin.getTime() + 4 * HARI)];
}

/** Hari kerja (Senin–Jumat) dari `dari` sampai `sampai`, inklusif, sebagai YYYY-MM-DD. */
export function hariKerja(dari: string, sampai: string): string[] {
  const out: string[] = [];
  for (let d = tanggalDb(dari); d <= tanggalDb(sampai); d = new Date(d.getTime() + HARI)) {
    const h = d.getUTCDay();
    if (h !== 0 && h !== 6) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export function bulanRomawi(d: Date): string {
  return ROMAWI[Number(ymd(d).slice(5, 7)) - 1];
}
