import Link from 'next/link';
import { Peran, StatusOrder, StatusPengajar } from '@prisma/client';
import { Shell, type ItemNav } from '@/components/Nav';
import { logout } from '@/app/actions/akun';
import { db } from '@/lib/db';
import { LABEL_PERAN, inisial, tanggalPanjang } from '@/lib/format';
import { kirimPengingatSla } from '@/lib/logic/order';
import { beranda } from '@/lib/peran';
import { wajibLogin, type Pengguna } from '@/lib/session';

async function menu(u: Pengguna): Promise<ItemNav[]> {
  const dasbor: ItemNav = { href: '/dasbor', label: 'Dasbor order', prefix: '/order' };
  switch (u.peran) {
    case Peran.admin:
      return [
        { href: '/admin', label: 'Pengguna', exact: true, prefix: '/admin/pengguna' },
        { href: '/admin/master', label: 'Data master & SLA' },
        dasbor,
      ];
    case Peran.marketing: {
      const n = await db.order.count({ where: { marketingId: u.id, status: { in: [StatusOrder.RFQ, StatusOrder.QUOTATION, StatusOrder.SPK_DRAF, StatusOrder.LAPORAN] } } });
      return [{ ...dasbor, count: n }, { href: '/order/baru', label: 'RFQ baru', exact: true }];
    }
    case Peran.kadep_marketing:
    case Peran.kadep_dps: {
      const n = await db.order.count({ where: { status: u.peran === Peran.kadep_marketing ? StatusOrder.APPROVAL_1 : StatusOrder.APPROVAL_2 } });
      return [{ href: '/approval', label: 'Antrean approval', count: n }, dasbor];
    }
    case Peran.dps: {
      const n = await db.order.count({ where: { OR: [{ status: StatusOrder.SILABUS_RAK, silabus: { diteruskanPada: null } }, { status: { in: [StatusOrder.PERSIAPAN, StatusOrder.PELAKSANAAN] } }] } });
      return [{ ...dasbor, count: n }, { href: '/operasional', label: 'Jadwal & operasional' }];
    }
    case Peran.upt: {
      const n = await db.order.count({ where: { unitId: u.unitId, status: StatusOrder.SILABUS_RAK, silabus: { diteruskanPada: { not: null } } } });
      return [{ href: '/upt', label: 'Request Silabus & RAK', count: n, prefix: '/order' }];
    }
    case Peran.pengajar: {
      const n = await db.penugasanPengajar.count({ where: { pengajarId: u.id, status: StatusPengajar.MENUNGGU } });
      return [{ href: '/pengajar', label: 'Penugasan mengajar', count: n, prefix: '/order' }];
    }
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await wajibLogin();
  await kirimPengingatSla();
  const [nav, belum] = await Promise.all([menu(u), db.notifikasi.count({ where: { userId: u.id, dibaca: false } })]);
  const sub = [LABEL_PERAN[u.peran], u.unit?.nama].filter(Boolean).join(' · ');

  return (
    <Shell
      nav={nav}
      wordmark={<Link href={beranda(u.peran)} className="wordmark">SPK · Direktorat 3</Link>}
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
