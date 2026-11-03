import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusDokumen } from '@prisma/client';
import { KpiMeter } from '@/components/badges';
import { Form, Submit } from '@/components/Form';
import { AlurDokumen, Memo, RiwayatPengesahan } from '@/components/surat';
import { TabelPenugasan } from '@/components/TabelPenugasan';
import { ajukanPerintah, hapusDraf, turunkanPerintah } from '@/app/actions/perintah';
import { db } from '@/lib/db';
import { DOKUMEN_BISA_DIUBAH, DOKUMEN_SAH, staffDenganKpi } from '@/lib/logic/perintah';
import { ambilPerintah, includeRingkas } from '@/lib/queries';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Detail perintah kerja' };

export default async function DetailPerintahPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await wajibLogin('spv');
  const pr = await ambilPerintah(Number((await params).id) || 0);
  if (!pr || pr.spvId !== u.id) notFound();
  const sah = DOKUMEN_SAH.includes(pr.status);
  const [penugasan, staff] = await Promise.all([
    db.penugasan.findMany({ where: { perintahId: pr.id }, include: includeRingkas, orderBy: { dibuatPada: 'asc' } }),
    sah ? staffDenganKpi(u.divisiId!) : Promise.resolve([]),
  ]);
  const sudah = new Set(penugasan.map(p => p.staffId));
  const tersedia = staff.filter(s => !sudah.has(s.id));

  return (
    <>
      <div className="page-head"><Link className="back" href="/spv/perintah">← ISPK & SPK</Link></div>
      <AlurDokumen pr={pr} />

      {pr.status === StatusDokumen.DITOLAK && (
        <p className="banner bad"><strong>Ditolak Manager:</strong>{pr.alasanTolak}</p>
      )}
      {pr.status === StatusDokumen.MENUNGGU_PENGESAHAN && (
        <p className="banner info"><strong>Menunggu pengesahan</strong>Manager divisi sedang meninjau perintah ini.</p>
      )}

      {DOKUMEN_BISA_DIUBAH.includes(pr.status) && (
        <div className="form-actions start">
          <Link className="btn btn-ghost" href={`/spv/perintah/${pr.id}/ubah`}>{pr.status === StatusDokumen.DITOLAK ? 'Revisi isi' : 'Ubah draf'}</Link>
          <Form action={ajukanPerintah.bind(null, pr.id)}><Submit>{pr.status === StatusDokumen.DITOLAK ? 'Ajukan ulang ke Manager' : 'Ajukan ke Manager'}</Submit></Form>
          {pr.status === StatusDokumen.DRAF && (
            <Form action={hapusDraf.bind(null, pr.id)} confirm="Hapus draf ini?"><Submit className="btn btn-danger">Hapus draf</Submit></Form>
          )}
        </div>
      )}

      <div className="grid-2 wide-left">
        <Memo pr={pr} />
        <div className="stack-lg">
          {sah && (
            <section className="card highlight" aria-labelledby="h-turun">
              <div className="card-head"><h2 id="h-turun">Turunkan ke staff</h2></div>
              {!tersedia.length ? <p className="empty">Semua staff divisi sudah menerima perintah ini.</p> : (
                <Form action={turunkanPerintah.bind(null, pr.id)} className="stack">
                  <ul className="staff-pick">
                    {tersedia.map(s => (
                      <li key={s.id}>
                        <label>
                          <input type="checkbox" name="staff" value={s.id} />
                          <span className="grow"><strong>{s.nama}</strong> <span className="small muted">{s.jabatan}</span></span>
                          <KpiMeter aktif={s.jumlahAktif} batas={s.batasTugasAktif} />
                        </label>
                      </li>
                    ))}
                  </ul>
                  {tersedia.some(s => s.penuh) && <p className="hint">Staff dengan KPI penuh akan mendapat alert dan boleh menolak.</p>}
                  <div className="form-actions start"><Submit>Turunkan perintah</Submit></div>
                </Form>
              )}
            </section>
          )}
          <section className="card">
            <div className="card-head"><h2>Riwayat pengesahan</h2></div>
            <RiwayatPengesahan pr={pr} />
          </section>
        </div>
      </div>

      {(sah || penugasan.length > 0) && (
        <section className="card">
          <div className="card-head"><h2>Penugasan staff</h2></div>
          <TabelPenugasan list={penugasan} href={id => `/spv/penugasan/${id}`} judul={false} />
        </section>
      )}
    </>
  );
}
