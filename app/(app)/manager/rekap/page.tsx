import { DaftarPica, TabelRekap } from '@/components/TabelRekap';
import { picaTerbukaDivisi, rekapDivisi } from '@/lib/logic/rekap';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Rekap KPI & PICA' };

export default async function RekapPage() {
  const u = await wajibLogin('manager');
  const [rows, pica] = await Promise.all([rekapDivisi(u.divisiId!), picaTerbukaDivisi(u.divisiId!)]);
  return (
    <>
      <div className="page-head"><h1>Rekap KPI & PICA</h1><p className="muted">Divisi {u.divisi?.nama}</p></div>
      <section className="card">
        <div className="card-head"><h2>Beban kerja & kedisiplinan staff</h2></div>
        <TabelRekap rows={rows} />
      </section>
      <section className="card">
        <div className="card-head"><h2>PICA terbuka</h2><span className="small muted">{pica.length} kendala</span></div>
        <DaftarPica list={pica} href={id => `/manager/penugasan/${id}`} />
      </section>
    </>
  );
}
