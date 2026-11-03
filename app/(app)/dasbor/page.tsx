import Link from 'next/link';
import { JenisLayanan, Peran, type Prisma } from '@prisma/client';
import { KELOMPOK } from '@/components/surat';
import { TabelOrder } from '@/components/TabelOrder';
import { db } from '@/lib/db';
import { LAYANAN } from '@/lib/layanan';
import { STATUS_TUTUP } from '@/lib/logic/aturan';
import { hitungSla, petaSla } from '@/lib/logic/order';
import { includeRingkas } from '@/lib/queries';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Dasbor order' };

/** Dasbor monitoring RFQ → BAST dengan indikator SLA dan filter layanan/tahap. */
export default async function DasborPage({ searchParams }: { searchParams: Promise<{ tahap?: string; jenis?: string; tutup?: string }> }) {
  const u = await wajibLogin('admin', 'marketing', 'kadep_marketing', 'dps', 'kadep_dps');
  const q = await searchParams;
  const tahap = Number.isInteger(Number(q.tahap)) && KELOMPOK[Number(q.tahap)] ? Number(q.tahap) : null;
  const jenis = q.jenis && q.jenis in JenisLayanan ? (q.jenis as JenisLayanan) : null;
  const where: Prisma.OrderWhereInput = {
    ...(jenis ? { jenis } : {}),
    ...(tahap != null ? { status: { in: KELOMPOK[tahap].status } } : q.tutup ? { status: { in: STATUS_TUTUP } } : { status: { notIn: STATUS_TUTUP } }),
  };
  const [list, semua, peta] = await Promise.all([
    db.order.findMany({ where, include: includeRingkas, orderBy: [{ tahapMulai: 'asc' }] }),
    db.order.findMany({ where: jenis ? { jenis } : {}, select: { status: true, tahapMulai: true, tglMulai: true, tglSelesai: true } }),
    petaSla(),
  ]);
  const lewat = semua.filter(o => hitungSla(o, peta)?.keadaan === 'lewat').length;
  const href = (p: Record<string, string | number | null>) => {
    const s = new URLSearchParams();
    const g = { tahap, jenis, tutup: q.tutup ?? null, ...p };
    Object.entries(g).forEach(([k, v]) => v != null && v !== '' && s.set(k, String(v)));
    return `/dasbor${s.size ? `?${s}` : ''}`;
  };
  // Order paling mendesak (lewat → mendekati → aman) di atas.
  const urut = { lewat: 0, dekat: 1, aman: 2 } as const;
  list.sort((a, b) => (urut[hitungSla(a, peta)?.keadaan ?? 'aman'] - urut[hitungSla(b, peta)?.keadaan ?? 'aman']));

  return (
    <>
      <div className="page-head">
        <div className="row-badges" style={{ justifyContent: 'space-between' }}>
          <h1>Dasbor order</h1>
          {u.peran === Peran.marketing && <Link className="btn btn-primary" href="/order/baru">Catat RFQ baru</Link>}
        </div>
      </div>
      <nav className="stats pipeline" aria-label="Tahap order">
        {KELOMPOK.map((k, i) => (
          <Link key={k.label} className="stat" href={href({ tahap: tahap === i ? null : i, tutup: null })} aria-current={tahap === i ? 'page' : undefined}>
            <div className="stat-label">{k.label}</div>
            <div className="stat-value">{semua.filter(o => k.status.includes(o.status)).length}</div>
          </Link>
        ))}
        <div className="stat"><div className="stat-label">Lewat SLA</div><div className="stat-value sla-angka">{lewat}</div></div>
      </nav>
      <div className="filters" role="group" aria-label="Saring layanan">
        <Link className={`btn btn-small ${!jenis ? 'btn-primary' : 'btn-ghost'}`} href={href({ jenis: null })}>Semua layanan</Link>
        {Object.values(JenisLayanan).map(j => (
          <Link key={j} className={`btn btn-small ${jenis === j ? 'btn-primary' : 'btn-ghost'}`} href={href({ jenis: j })}>{LAYANAN[j].label}</Link>
        ))}
      </div>
      <section className="card">
        <div className="card-head">
          <h2>{tahap != null ? KELOMPOK[tahap].label : q.tutup ? 'Selesai, batal & tidak sanggup' : 'Order berjalan'}</h2>
          {tahap == null && <Link href={href({ tutup: q.tutup ? null : 1 })}>{q.tutup ? 'Lihat order berjalan' : 'Lihat order tertutup'}</Link>}
        </div>
        <TabelOrder list={list} peta={peta} />
      </section>
    </>
  );
}
