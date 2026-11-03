import { StatusPica, StatusTugas } from '@prisma/client';
import { Form, Submit } from './Form';
import { Lampiran } from './surat';
import * as A from '@/app/actions/tugas';
import { hariDb, tanggalDb, waktu } from '@/lib/format';
import { STATUS_KERJA, skorRata } from '@/lib/logic/aturan';
import { hariBolong, persenAp } from '@/lib/logic/laporan';
import type { PenugasanLengkap } from '@/lib/queries';
import { hariKerja, mingguIso, rentangMinggu, ymd } from '@/lib/waktu';

export type Mode = 'staff' | 'spv' | 'lihat';
type Props = { p: PenugasanLengkap; mode: Mode };

const sedangKerja = (p: PenugasanLengkap) => STATUS_KERJA.includes(p.status);

// ---------- Tanya-jawab ----------

export function ThreadTanya({ p, mode }: Props) {
  const bisaTanya = mode === 'staff' && !([StatusTugas.DILAPORKAN, StatusTugas.DISETUJUI, StatusTugas.DITOLAK_STAFF] as StatusTugas[]).includes(p.status);
  return (
    <section className="card" aria-labelledby="h-tanya">
      <div className="card-head"><h2 id="h-tanya">Tanya-jawab</h2></div>
      {!p.pertanyaan.length && <p className="empty">Belum ada pertanyaan.</p>}
      <ol className="qa-list">
        {p.pertanyaan.map(q => (
          <li key={q.id}>
            <div className="qa-q"><span className="who">{p.staff.nama}</span> <span className="muted small">{waktu(q.ditanyaPada)}</span><p>{q.isi}</p></div>
            {q.jawaban ? (
              <div className="qa-a"><span className="who">{p.perintah.spv.nama}</span> <span className="muted small">{waktu(q.dijawabPada)}</span><p>{q.jawaban}</p></div>
            ) : mode === 'spv' ? (
              <Form action={A.jawab.bind(null, q.id)} className="qa-a stack">
                <label>Jawaban<textarea name="jawaban" rows={2} required /></label>
                <div className="form-actions start"><Submit className="btn btn-primary btn-small">Kirim jawaban</Submit></div>
              </Form>
            ) : (
              <p className="qa-a muted small">Menunggu jawaban SPV.</p>
            )}
          </li>
        ))}
      </ol>
      {bisaTanya && (
        <Form action={A.tanya.bind(null, p.id)} className="stack" reset>
          <label>Ajukan pertanyaan ke SPV<textarea name="isi" rows={2} required placeholder="Bagian mana yang belum jelas?" /></label>
          <div className="form-actions start"><Submit className="btn btn-ghost btn-small">Kirim pertanyaan</Submit></div>
        </Form>
      )}
    </section>
  );
}

// ---------- Action Plan ----------

export function ActionPlan({ p, mode }: Props) {
  const ubah = mode === 'staff' && sedangKerja(p);
  const batas = ymd(p.perintah.tenggat);
  const pertamaBelum = p.actionPlan.find(a => !a.selesai)?.id;
  return (
    <section className="card" aria-labelledby="h-ap">
      <div className="card-head">
        <h2 id="h-ap">Action Plan (AP)</h2>
        <span className="small muted num">{p.actionPlan.filter(a => a.selesai).length}/{p.actionPlan.length} selesai · {persenAp(p.actionPlan)}%</span>
      </div>
      <ol className="steps">
        {p.actionPlan.map(a => {
          const lewat = !a.selesai && ymd(a.targetTanggal) < ymd();
          return (
            <li key={a.id} className={`step${a.selesai ? ' step-done' : a.id === pertamaBelum ? ' step-next' : ''}`}>
              <span className="step-num">{a.urutan}</span>
              <div className="step-body">
                <div>{a.kegiatan}</div>
                <div className="row-badges small muted">
                  {a.selesai ? <span className="status s-disetujui">Selesai {waktu(a.selesaiPada)}</span> : <span>Target {tanggalDb(a.targetTanggal)}</span>}
                  {lewat && <span className="status s-terlambat">Lewat target</span>}
                </div>
                {ubah && !a.selesai && (
                  <div className="row-badges">
                    <Form action={A.ubahTargetAp.bind(null, a.id)} className="ap-target">
                      <label className="sr-only" htmlFor={`t-${a.id}`}>Target baru AP {a.urutan}</label>
                      <input id={`t-${a.id}`} type="date" name="target" defaultValue={ymd(a.targetTanggal)} max={batas} required />
                      <Submit className="btn-text">Ubah target</Submit>
                    </Form>
                    <Form action={A.selesaikanAp.bind(null, a.id)} confirm={`Tandai AP ${a.urutan} selesai?`}>
                      <Submit className="btn-text">Tandai selesai</Submit>
                    </Form>
                    <Form action={A.hapusAp.bind(null, a.id)} confirm="Hapus AP ini?">
                      <Submit className="btn-text">Hapus</Submit>
                    </Form>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {ubah && (
        <Form action={A.tambahAp.bind(null, p.id)} className="step-form" reset>
          <label className="grow">Kegiatan AP baru<input name="kegiatan" required maxLength={255} /></label>
          <label>Target<input type="date" name="target" max={batas} required /></label>
          <div style={{ alignSelf: 'flex-end' }}><Submit className="btn btn-ghost">Tambah AP</Submit></div>
        </Form>
      )}
      {mode === 'staff' && sedangKerja(p) && <p className="hint">AP bisa ditandai selesai di sini atau lewat laporan harian.</p>}
    </section>
  );
}

// ---------- Laporan harian ----------

export function LaporanHarian({ p, mode }: Props) {
  const hariIni = ymd();
  const sudahHariIni = p.laporanHarian.some(l => ymd(l.tanggal) === hariIni || l.tanggal.toISOString().slice(0, 10) === hariIni);
  const bolong = new Set(hariBolong(p, p.laporanHarian));
  const ada = new Set(p.laporanHarian.map(l => l.tanggal.toISOString().slice(0, 10)));
  const akhir = p.dilaporkanPada ? ymd(p.dilaporkanPada) : hariIni;
  const hari = p.diterimaPada ? hariKerja(ymd(p.diterimaPada), akhir) : [];
  const apBelum = p.actionPlan.filter(a => !a.selesai);

  return (
    <section className="card" aria-labelledby="h-harian">
      <div className="card-head">
        <h2 id="h-harian">Laporan harian</h2>
        <span className="small muted">{ada.size} laporan{bolong.size ? ` · ${bolong.size} hari bolong` : ''}</span>
      </div>
      {hari.length > 0 && (
        <>
          <div className="harian-cal" role="img" aria-label={`${ada.size} hari dilaporkan, ${bolong.size} hari kerja tanpa laporan`}>
            {hari.map(h => (
              <span key={h} className={ada.has(h) ? 'ada' : bolong.has(h) ? 'bolong' : ''} title={h}>{Number(h.slice(8))}</span>
            ))}
          </div>
          <div className="legend"><span><i className="ada" />Ada laporan</span><span><i className="bolong" />Bolong</span><span><i />Hari ini / belum</span></div>
        </>
      )}

      {mode === 'staff' && sedangKerja(p) && (
        sudahHariIni
          ? <p className="banner ok small">Laporan harian hari ini sudah dikirim.</p>
          : (
            <Form action={A.laporanHarian.bind(null, p.id)} className="stack" reset>
              <label>AP yang dikerjakan hari ini
                <select name="actionPlanId" defaultValue={apBelum[0]?.id ?? ''}>
                  <option value="">— Tidak terkait AP tertentu —</option>
                  {p.actionPlan.map(a => <option key={a.id} value={a.id}>{a.urutan}. {a.kegiatan}{a.selesai ? ' (selesai)' : ''}</option>)}
                </select>
              </label>
              <label>Kegiatan & hasil hari ini<textarea name="kegiatan" rows={3} required /></label>
              <label className="check"><input type="checkbox" name="apSelesai" /> AP yang dipilih selesai hari ini</label>
              <label>Lampiran (opsional)<input type="file" name="lampiran" accept=".pdf,.jpg,.jpeg,.png" /><span className="hint">PDF/JPG/PNG, maks. 2 MB</span></label>
              <div className="form-actions start"><Submit>Kirim laporan harian</Submit></div>
            </Form>
          )
      )}

      {p.laporanHarian.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Tanggal</th><th>AP</th><th>Kegiatan</th><th className="num">Progres</th></tr></thead>
            <tbody>
              {p.laporanHarian.map(l => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{hariDb(l.tanggal)}</td>
                  <td>{l.actionPlan ? `${l.actionPlan.urutan}` : '—'}</td>
                  <td>{l.kegiatan}{l.lampiran && <> · <Lampiran nama={l.lampiran} /></>}</td>
                  <td className="num">{l.progres}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!p.laporanHarian.length && mode !== 'staff' && <p className="empty">Belum ada laporan harian.</p>}
    </section>
  );
}

// ---------- Laporan mingguan & PICA ----------

function PicaFields() {
  return (
    <div className="pica-fields">
      <label>P · Problem<textarea name="problem" rows={2} /></label>
      <label>I · Identification (penyebab)<textarea name="identifikasi" rows={2} /></label>
      <label>CA · Corrective action<textarea name="correctiveAction" rows={2} /></label>
      <div className="stack">
        <label>PIC<input name="pic" /></label>
        <label>Due date<input type="date" name="dueDate" /></label>
      </div>
    </div>
  );
}

export function LaporanMingguan({ p, mode }: Props) {
  const minggu = mingguIso();
  const sudah = p.laporanMingguan.some(l => l.minggu === minggu);
  const rentang = (m: string) => rentangMinggu(m).map(d => tanggalDb(d)).join(' – ');
  return (
    <section className="card" aria-labelledby="h-mingguan">
      <div className="card-head"><h2 id="h-mingguan">Laporan mingguan & PICA</h2></div>

      {mode === 'staff' && sedangKerja(p) && !sudah && (
        <Form action={A.laporanMingguan.bind(null, p.id)} className="stack" reset>
          <p className="small muted">Minggu {minggu} · {rentang(minggu)}</p>
          <label>Ringkasan pekerjaan minggu ini<textarea name="ringkasan" rows={3} required /></label>
          <fieldset>
            <legend>Ada kendala kinerja?</legend>
            <div className="choice">
              <label><input type="radio" name="adaKendala" value="tidak" required /> <span><strong>Tidak ada</strong><span className="small muted">Pekerjaan berjalan sesuai AP</span></span></label>
              <label><input type="radio" name="adaKendala" value="ya" /> <span><strong>Ada kendala</strong><span className="small muted">Wajib isi PICA</span></span></label>
            </div>
          </fieldset>
          <div className="pica-form"><PicaFields /></div>
          <div className="form-actions start"><Submit>Kirim laporan mingguan</Submit></div>
        </Form>
      )}
      {mode === 'staff' && sudah && <p className="banner ok small">Laporan mingguan {minggu} sudah dikirim.</p>}

      {!p.laporanMingguan.length && <p className="empty">Belum ada laporan mingguan.</p>}
      {p.laporanMingguan.map(lm => (
        <div key={lm.id} className="week">
          <div className="week-head">
            <strong>{lm.minggu}</strong><span className="small muted">{rentang(lm.minggu)}</span>
            {lm.adaKendala ? <span className="status s-terlambat">Ada kendala</span> : <span className="status s-disetujui">Tanpa kendala</span>}
          </div>
          <p>{lm.ringkasan}</p>
          {lm.pica.map(pc => (
            <dl key={pc.id} className="pica">
              <div><dt><b>P</b>Problem</dt><dd>{pc.problem}</dd></div>
              <div><dt><b>I</b>Identification</dt><dd>{pc.identifikasi}</dd></div>
              <div><dt><b>CA</b>Corrective action</dt><dd>{pc.correctiveAction}</dd></div>
              <div><dt>PIC · Due date</dt><dd>{pc.pic} · {tanggalDb(pc.dueDate)}</dd></div>
              <div className="pica-foot">
                <span className={`status ${pc.status === StatusPica.OPEN ? 's-open' : 's-closed'}`}>{pc.status === StatusPica.OPEN ? 'Open' : `Closed ${waktu(pc.ditutupPada)}`}</span>
                {pc.status === StatusPica.OPEN && ymd(pc.dueDate) < ymd() && <span className="status s-terlambat">Lewat due date</span>}
                {pc.status === StatusPica.OPEN && mode !== 'lihat' && (
                  <Form action={A.tutupPica.bind(null, pc.id)} confirm="Tutup PICA ini? Pastikan corrective action sudah dilakukan.">
                    <Submit className="btn btn-ghost btn-small">Tutup PICA</Submit>
                  </Form>
                )}
              </div>
            </dl>
          ))}
          {mode === 'staff' && sedangKerja(p) && lm.minggu === minggu && (
            <details>
              <summary className="small">Tambah PICA</summary>
              <Form action={A.tambahPica.bind(null, lm.id)} className="stack" reset><PicaFields /><div className="form-actions start"><Submit className="btn btn-ghost btn-small">Simpan PICA</Submit></div></Form>
            </details>
          )}
          {lm.tanggapanSpv && <p className="tanggapan"><span className="who">{p.perintah.spv.nama}:</span> {lm.tanggapanSpv}</p>}
          {mode === 'spv' && !lm.tanggapanSpv && (
            <Form action={A.tanggapiMingguan.bind(null, lm.id)} className="form-inline">
              <label className="grow sr-only" htmlFor={`tg-${lm.id}`}>Tanggapan</label>
              <input id={`tg-${lm.id}`} name="tanggapan" placeholder="Tanggapan untuk staff" required />
              <Submit className="btn btn-ghost">Tanggapi</Submit>
            </Form>
          )}
        </div>
      ))}
    </section>
  );
}

// ---------- Laporan akhir & evaluasi ----------

const SKOR = [['skorWaktu', 'Ketepatan waktu'], ['skorKualitas', 'Kualitas hasil'], ['skorKesesuaian', 'Kesesuaian instruksi']] as const;

export function LaporanAkhir({ p, mode }: Props) {
  const apSelesai = p.actionPlan.every(a => a.selesai);
  const evaluasiKe = (i: number) => p.evaluasi[i];
  return (
    <section className="card" aria-labelledby="h-akhir">
      <div className="card-head"><h2 id="h-akhir">Laporan akhir & evaluasi</h2></div>

      {mode === 'staff' && sedangKerja(p) && (
        apSelesai ? (
          <Form action={A.laporanAkhir.bind(null, p.id)} className="stack">
            <label>Ringkasan hasil pekerjaan<textarea name="hasil" rows={4} required /></label>
            <label>Kendala (opsional)<textarea name="kendala" rows={2} /></label>
            <label>Lampiran hasil (opsional)<input type="file" name="lampiran" accept=".pdf,.jpg,.jpeg,.png" /><span className="hint">PDF/JPG/PNG, maks. 2 MB</span></label>
            <div className="form-actions start"><Submit>Kirim laporan akhir</Submit></div>
          </Form>
        ) : <p className="empty">Laporan akhir bisa dikirim setelah semua AP selesai.</p>
      )}

      {!p.laporanAkhir.length && mode !== 'staff' && <p className="empty">Belum ada laporan akhir.</p>}
      {p.laporanAkhir.map((l, i) => {
        const e = evaluasiKe(i);
        return (
          <div key={l.id} className={`report${i < p.laporanAkhir.length - 1 ? ' old' : ''}`}>
            <div className="row-badges small muted"><strong>Laporan {i + 1}</strong><span>{waktu(l.dikirimPada)}</span>{l.dikirimPada > p.perintah.tenggat && <span className="status s-terlambat">Terlambat</span>}</div>
            <p>{l.hasil}</p>
            {l.kendala && <p className="small"><strong>Kendala:</strong> {l.kendala}</p>}
            {l.lampiran && <p className="small">Lampiran: <Lampiran nama={l.lampiran} /></p>}
            {e && (
              <div className="tanggapan">
                <div className="eval-head">
                  <span className={`status ${e.keputusan === 'setujui' ? 's-disetujui' : 's-revisi'}`}>{e.keputusan === 'setujui' ? 'Disetujui' : 'Perlu revisi'}</span>
                  <span className="score-num">{skorRata(e).toFixed(2)} <span>/ 5</span></span>
                  <span className="small muted">waktu {e.skorWaktu} · kualitas {e.skorKualitas} · kesesuaian {e.skorKesesuaian}</span>
                </div>
                {e.umpanBalik && <p>{e.umpanBalik}</p>}
              </div>
            )}
          </div>
        );
      })}

      {mode === 'spv' && p.status === StatusTugas.DILAPORKAN && (
        <Form action={A.evaluasi.bind(null, p.id)} className="stack card highlight">
          <h3 className="small">Evaluasi laporan akhir</h3>
          {SKOR.map(([name, label]) => (
            <fieldset key={name} className="score">
              <legend>{label}</legend>
              {[1, 2, 3, 4, 5].map(n => (
                <label key={n}><input type="radio" name={name} value={n} required /><span>{n}</span></label>
              ))}
            </fieldset>
          ))}
          <fieldset>
            <legend>Keputusan</legend>
            <label className="radio"><input type="radio" name="keputusan" value="setujui" required /> Setujui — poin diberikan otomatis</label>
            <label className="radio"><input type="radio" name="keputusan" value="revisi" /> Perlu revisi</label>
          </fieldset>
          <label>Umpan balik<textarea name="umpanBalik" rows={3} /><span className="hint">Wajib bila revisi.</span></label>
          <label>Buka kembali AP mulai nomor (opsional, untuk revisi)
            <select name="bukaMulai" defaultValue="">
              <option value="">— Tidak —</option>
              {p.actionPlan.map(a => <option key={a.id} value={a.urutan}>{a.urutan}. {a.kegiatan}</option>)}
            </select>
          </label>
          <div className="form-actions start"><Submit>Simpan evaluasi</Submit></div>
        </Form>
      )}
    </section>
  );
}
