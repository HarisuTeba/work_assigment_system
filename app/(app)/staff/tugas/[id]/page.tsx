import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusTugas } from '@prisma/client';
import { KpiMeter } from '@/components/badges';
import { DetailPenugasan } from '@/components/DetailPenugasan';
import { Form, Submit } from '@/components/Form';
import { terima, tolak } from '@/app/actions/tugas';
import { STATUS_RESPON } from '@/lib/logic/aturan';
import { infoKpi } from '@/lib/logic/penugasan';
import { ambilPenugasan } from '@/lib/queries';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Tugas' };

/** Panel respons: alert KPI muncul lebih dulu bila tugas aktif sudah mencapai batas. */
async function PanelRespons({ id, status }: { id: number; status: StatusTugas }) {
  const u = await wajibLogin('staff');
  const kpi = await infoKpi(u.id);
  const menunggu = status === StatusTugas.MENUNGGU_JAWABAN;
  return (
    <section className="stack" aria-labelledby="h-respons">
      {kpi.penuh && (
        <div className="kpi-alert" role="alert">
          <h2 id="h-respons">Batas KPI tugas aktif tercapai</h2>
          <p>Anda sedang mengerjakan <strong>{kpi.aktif}</strong> dari batas <strong>{kpi.batas}</strong> tugas aktif. Menerima perintah ini akan melebihi KPI Anda.</p>
          <KpiMeter aktif={kpi.aktif + 1} batas={kpi.batas} />
          <p className="small">Anda boleh menolak dengan alasan beban kerja, atau tetap menerima (akan dicatat “di atas KPI”).</p>
        </div>
      )}
      <div className="card highlight">
        {!kpi.penuh && <div className="card-head"><h2 id="h-respons">Respons Anda</h2><KpiMeter aktif={kpi.aktif} batas={kpi.batas} /></div>}
        {menunggu && <p className="banner info small"><strong>Menunggu jawaban SPV.</strong>Perintah bisa diterima setelah semua pertanyaan dijawab.</p>}
        <div className="grid-2 tight">
          <Form action={terima.bind(null, id)} className="stack" confirm={kpi.penuh ? 'Terima walau melebihi batas KPI?' : 'Saya sudah memahami perintah ini dan menerimanya.'}>
            <p className="small">Saya memahami isi perintah, langkah, dan tenggatnya.</p>
            <div className="form-actions start"><Submit>{kpi.penuh ? 'Tetap terima' : 'Paham & terima'}</Submit></div>
          </Form>
          <Form action={tolak.bind(null, id)} className="stack">
            <label>Alasan menolak
              <textarea name="alasan" rows={2} required defaultValue={kpi.penuh ? `Melebihi batas KPI: sudah ${kpi.aktif}/${kpi.batas} tugas aktif.` : ''} />
            </label>
            <div className="form-actions start"><Submit className="btn btn-danger">Tolak perintah</Submit></div>
          </Form>
        </div>
      </div>
    </section>
  );
}

export default async function TugasPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await wajibLogin('staff');
  const p = await ambilPenugasan(Number((await params).id) || 0);
  if (!p || p.staffId !== u.id) notFound();
  return (
    <>
      <div className="page-head">
        <Link className="back" href="/staff">← Perintah kerja saya</Link>
        <h1>{p.perintah.judul}</h1>
      </div>
      <DetailPenugasan p={p} mode="staff" atas={STATUS_RESPON.includes(p.status) ? <PanelRespons id={p.id} status={p.status} /> : null} />
    </>
  );
}
