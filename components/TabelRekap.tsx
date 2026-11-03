import Link from 'next/link';
import { KpiMeter } from './badges';
import { tanggalDb } from '@/lib/format';
import type { picaTerbukaDivisi, rekapDivisi } from '@/lib/logic/rekap';
import { ymd } from '@/lib/waktu';

export function TabelRekap({ rows }: { rows: Awaited<ReturnType<typeof rekapDivisi>> }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th>Staff</th><th>KPI tugas aktif</th><th className="num">Menunggu respons</th><th className="num">Terlambat (30 hr)</th><th className="num">PICA open</th><th className="num">Hari bolong (30 hr)</th><th className="num">Poin</th></tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.user.id} className={r.aktif > r.batas ? 'warn' : ''}>
              <td><strong>{r.user.nama}</strong><br /><span className="small muted">{r.user.jabatan}</span></td>
              <td><KpiMeter aktif={r.aktif} batas={r.batas} /></td>
              <td className="num">{r.menunggu || '—'}</td>
              <td className="num">{r.terlambat || '—'}</td>
              <td className="num">{r.picaOpen ? <span className="status s-open">{r.picaOpen}</span> : '—'}</td>
              <td className="num">{r.bolong || '—'}</td>
              <td className="num points">{r.poin}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DaftarPica({ list, href }: { list: Awaited<ReturnType<typeof picaTerbukaDivisi>>; href: (penugasanId: number) => string }) {
  if (!list.length) return <p className="empty">Tidak ada PICA terbuka.</p>;
  return (
    <ul className="list">
      {list.map(pc => {
        const p = pc.laporanMingguan.penugasan;
        const lewat = ymd(pc.dueDate) < ymd();
        return (
          <li key={pc.id} className="list-row col">
            <Link className="grow" href={href(p.id)}><strong>{pc.problem}</strong></Link>
            <span className="small muted">{p.staff.nama} · {p.perintah.judul}</span>
            <span className="row-badges small">
              <span>CA: {pc.correctiveAction}</span>
              <span className="muted">Due {tanggalDb(pc.dueDate)}</span>
              {lewat && <span className="status s-terlambat">Lewat due date</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
