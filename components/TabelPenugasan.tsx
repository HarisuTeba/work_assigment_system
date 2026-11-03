import Link from 'next/link';
import { Progres, StatusTgs, Terlambat } from './badges';
import { waktu } from '@/lib/format';
import { persenAp } from '@/lib/logic/laporan';
import { picaTerbuka, type PenugasanRingkas } from '@/lib/queries';

/** Tabel penugasan; `href` menentukan tautan detail per baris (null = tanpa tautan). */
export function TabelPenugasan({ list, href, judul = true }: { list: PenugasanRingkas[]; href: (id: number) => string | null; judul?: boolean }) {
  if (!list.length) return <p className="empty">Belum ada penugasan.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Staff</th>{judul && <th>Perintah</th>}<th>Status</th><th>Progres AP</th><th className="num">PICA open</th><th>Tenggat</th>
          </tr>
        </thead>
        <tbody>
          {list.map(p => {
            const h = href(p.id);
            const pica = picaTerbuka(p);
            return (
              <tr key={p.id}>
                <td>{h ? <Link href={h}><strong>{p.staff.nama}</strong></Link> : <strong>{p.staff.nama}</strong>}<br /><span className="small muted">{p.staff.jabatan}</span></td>
                {judul && <td>{p.perintah.judul}<br /><span className="small muted">{p.perintah.nomor}</span></td>}
                <td>
                  <div className="row-badges"><StatusTgs s={p.status} /><Terlambat ya={p.terlambat} />{p.diAtasKpi && <span className="kpi-label">Di atas KPI</span>}</div>
                  {p.pertanyaan.length > 0 && <div className="small muted">{p.pertanyaan.length} pertanyaan belum dijawab</div>}
                  {p.alasanTolak && <div className="small muted">Alasan: {p.alasanTolak}</div>}
                </td>
                <td>{p.actionPlan.length ? <Progres persen={persenAp(p.actionPlan)} /> : '—'}</td>
                <td className="num">{pica ? <span className="status s-open">{pica}</span> : '—'}</td>
                <td className="small">{waktu(p.perintah.tenggat)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
