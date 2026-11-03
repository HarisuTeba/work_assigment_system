import Link from 'next/link';
import { StatusTugas } from '@prisma/client';
import { Jenis, KpiMeter, Prio, Progres, StatusTgs, Terlambat } from '@/components/badges';
import { db } from '@/lib/db';
import { sisaWaktu, waktu } from '@/lib/format';
import { STATUS_KERJA, STATUS_RESPON } from '@/lib/logic/aturan';
import { persenAp } from '@/lib/logic/laporan';
import { infoKpi } from '@/lib/logic/penugasan';
import { wajibLogin } from '@/lib/session';
import { hariIni } from '@/lib/waktu';

export const metadata = { title: 'Perintah kerja saya' };

export default async function StaffPage() {
  const u = await wajibLogin('staff');
  const [list, kpi] = await Promise.all([
    db.penugasan.findMany({
      where: { staffId: u.id },
      include: {
        perintah: { include: { spv: true } },
        actionPlan: { select: { selesai: true } },
        laporanHarian: { where: { tanggal: hariIni() }, select: { id: true } },
      },
      orderBy: { perintah: { tenggat: 'asc' } },
    }),
    infoKpi(u.id),
  ]);
  const baru = list.filter(p => STATUS_RESPON.includes(p.status));
  const kerja = list.filter(p => STATUS_KERJA.includes(p.status) || p.status === StatusTugas.DILAPORKAN);
  const selesai = list.filter(p => p.status === StatusTugas.DISETUJUI || p.status === StatusTugas.DITOLAK_STAFF);
  const belumHarian = kerja.filter(p => STATUS_KERJA.includes(p.status) && !p.laporanHarian.length);

  const Baris = ({ p }: { p: (typeof list)[number] }) => (
    <li className="list-row">
      <Jenis j={p.perintah.jenis} />
      <Link className="grow" href={`/staff/tugas/${p.id}`}>
        <strong>{p.perintah.judul}</strong><br />
        <span className="small muted">{p.perintah.nomor} · dari {p.perintah.spv.nama} · tenggat {waktu(p.perintah.tenggat)} ({sisaWaktu(p.perintah.tenggat)})</span>
      </Link>
      <span className="row-badges">
        {STATUS_KERJA.includes(p.status) && <Progres persen={persenAp(p.actionPlan)} />}
        <Prio p={p.perintah.prioritas} />
        <StatusTgs s={p.status} />
        <Terlambat ya={p.terlambat} />
      </span>
    </li>
  );

  return (
    <>
      <div className="page-head">
        <h1>Perintah kerja saya</h1>
        <div className="row-badges"><span className="muted">KPI tugas aktif</span><KpiMeter aktif={kpi.aktif} batas={kpi.batas} /></div>
      </div>

      {belumHarian.length > 0 && (
        <p className="banner warn"><strong>Laporan harian belum dikirim</strong>{belumHarian.map(p => p.perintah.judul).join(', ')}</p>
      )}

      <section className={`card${baru.length ? ' highlight' : ''}`}>
        <div className="card-head"><h2>Perintah baru</h2><span className="small muted">pahami, tanyakan, lalu terima atau tolak</span></div>
        {kpi.penuh && baru.length > 0 && (
          <p className="banner bad small"><strong>KPI penuh ({kpi.aktif}/{kpi.batas}).</strong>Anda boleh menolak perintah baru dengan alasan beban kerja.</p>
        )}
        {baru.length ? <ul className="list">{baru.map(p => <Baris key={p.id} p={p} />)}</ul> : <p className="empty">Tidak ada perintah baru.</p>}
      </section>
      <section className="card">
        <div className="card-head"><h2>Sedang dikerjakan</h2></div>
        {kerja.length ? <ul className="list">{kerja.map(p => <Baris key={p.id} p={p} />)}</ul> : <p className="empty">Tidak ada tugas aktif.</p>}
      </section>
      <details className="card">
        <summary>Riwayat ({selesai.length})</summary>
        <ul className="list">{selesai.map(p => <Baris key={p.id} p={p} />)}</ul>
      </details>
    </>
  );
}
