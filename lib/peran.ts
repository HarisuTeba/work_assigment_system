import type { Peran } from '@prisma/client';

// Dipakai juga oleh middleware (edge), jadi hanya boleh impor tipe.

/** Halaman awal tiap peran. */
export function beranda(peran: Peran): string {
  switch (peran) {
    case 'admin': return '/admin';
    case 'upt': return '/upt';
    case 'pengajar': return '/pengajar';
    case 'kadep_marketing':
    case 'kadep_dps': return '/approval';
    default: return '/dasbor';
  }
}

/** Area rute yang hanya boleh dibuka peran tertentu. */
export const AREA: Record<string, Peran[]> = {
  admin: ['admin'],
  upt: ['upt'],
  pengajar: ['pengajar'],
  approval: ['kadep_marketing', 'kadep_dps'],
  dasbor: ['admin', 'marketing', 'kadep_marketing', 'dps', 'kadep_dps'],
  operasional: ['dps', 'kadep_dps'],
};

/** Peran yang melihat seluruh order (bukan hanya yang terkait unit/penugasannya). */
export const LIHAT_SEMUA: Peran[] = ['admin', 'marketing', 'kadep_marketing', 'dps', 'kadep_dps'];
