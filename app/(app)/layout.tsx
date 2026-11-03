import Link from 'next/link';
import { Peran, StatusDokumen, StatusTugas } from '@prisma/client';
import { Shell, type ItemNav } from '@/components/Nav';
import { logout } from '@/app/actions/akun';
import { db } from '@/lib/db';
import { LABEL_PERAN, inisial, tanggalPanjang } from '@/lib/format';
import { refreshTerlambat } from '@/lib/logic/penugasan';
import { wajibLogin, type Pengguna } from '@/lib/session';

async function menu(u: Pengguna): Promise<ItemNav[]> {
  const peringkat = { href: '/peringkat', label: 'Peringkat' };
  switch (u.peran) {
    case Peran.admin:
      return [
        { href: '/admin', label: 'Ringkasan', exact: true },
        { href: '/admin/divisi', label: 'Divisi' },
        { href: '/admin/pengguna', label: 'Pengguna & KPI' },
      ];
    case Peran.manager: {
      const menunggu = await db.perintahKerja.count({ where: { divisiId: u.divisiId!, status: StatusDokumen.MENUNGGU_PENGESAHAN } });
      return [
        { href: '/manager', label: 'Ringkasan', exact: true },
        { href: '/manager/pengesahan', label: 'Pengesahan', count: menunggu },
        { href: '/manager/rekap', label: 'Rekap KPI & PICA' },
        peringkat,
      ];
    }
    case Peran.spv: {
      const [perlu, tanya, evaluasi] = await Promise.all([
        db.perintahKerja.count({ where: { spvId: u.id, status: { in: [StatusDokumen.DITOLAK, StatusDokumen.DISAHKAN] } } }),
        db.pertanyaan.count({ where: { jawaban: null, penugasan: { perintah: { spvId: u.id } } } }),
        db.penugasan.count({ where: { status: StatusTugas.DILAPORKAN, perintah: { spvId: u.id } } }),
      ]);
      return [
        { href: '/spv', label: 'Ringkasan', exact: true },
        { href: '/spv/perintah', label: 'ISPK & SPK', count: perlu },
        { href: '/spv/penugasan', label: 'Penugasan staff', count: tanya + evaluasi },
        { href: '/spv/reward', label: 'Reward' },
        { href: '/spv/teguran', label: 'Teguran' },
        peringkat,
      ];
    }
    case Peran.staff: {
      const [baru, teguran] = await Promise.all([
        db.penugasan.count({ where: { staffId: u.id, status: StatusTugas.MENUNGGU_RESPON } }),
        db.teguran.count({ where: { penerimaId: u.id, dibacaPada: null } }),
      ]);
      return [
        { href: '/staff', label: 'Perintah kerja', exact: true, prefix: '/staff/tugas', count: baru },
        { href: '/staff/nilai', label: 'Nilai & reward' },
        { href: '/staff/teguran', label: 'Teguran', count: teguran },
        peringkat,
      ];
    }
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await wajibLogin();
  await refreshTerlambat();
  const [nav, belum] = await Promise.all([menu(u), db.notifikasi.count({ where: { userId: u.id, dibaca: false } })]);
  const sub = [LABEL_PERAN[u.peran], u.divisi?.nama].filter(Boolean).join(' · ');

  return (
    <Shell
      nav={nav}
      wordmark={<Link href={`/${u.peran}`} className="wordmark">Perintah Kerja</Link>}
      foot={
        <>
          <Link href="/profil" className="nav-item">Profil & password</Link>
          <form action={logout}><button type="submit" className="nav-item">Keluar</button></form>
        </>
      }
      top={
        <>
          <span className="dateline">{tanggalPanjang(new Date())}</span>
          <Link href="/notifikasi" className="bell" aria-label={`Notifikasi, ${belum} belum dibaca`}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            {belum > 0 && <span className="bell-count">{belum}</span>}
          </Link>
          <Link href="/profil" className="me-chip">
            <span className="avatar" aria-hidden>{inisial(u.nama)}</span>
            <span className="me-text"><strong>{u.nama}</strong><span className="small muted">{sub}</span></span>
          </Link>
        </>
      }
    >
      <main className="content">{children}</main>
    </Shell>
  );
}
