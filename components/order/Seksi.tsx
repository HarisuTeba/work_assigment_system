import { JenisPo, Peran, StatusOrder, StatusPengajar, StatusPp, StatusQuotation, type Fasilitas, type Unit, type User } from '@prisma/client';
import Link from 'next/link';
import { Peringatan, StatusPgj } from '../badges';
import { Form, Submit } from '../Form';
import { Lampiran } from '../surat';
import { MarginInput, RakInput } from './InputKlien';
import * as A from '@/app/actions/order';
import { LABEL_CUSTOMER, LABEL_PP, rupiah, tanggalDb, waktu } from '@/lib/format';
import { LAYANAN } from '@/lib/layanan';
import { BOLEH_UBAH_JADWAL } from '@/lib/logic/aturan';
import { ppMepet } from '@/lib/logic/operasional';
import { totalRak } from '@/lib/logic/silabus';
import type { OrderLengkap } from '@/lib/queries';
import type { Pengguna } from '@/lib/session';
import { HARI, ymd } from '@/lib/waktu';

type P = { o: OrderLengkap; u: Pengguna };
const ya = (u: Pengguna, ...peran: Peran[]) => peran.includes(u.peran);
const di = (o: OrderLengkap, ...s: StatusOrder[]) => s.includes(o.status);

// ---------- Ringkasan RFQ ----------

export function Ringkasan({ o }: { o: OrderLengkap }) {
  const detail = o.detail as Record<string, string>;
  return (
    <section className="card" aria-labelledby="h-rfq">
      <div className="card-head"><h2 id="h-rfq">Data RFQ</h2><span className="small muted">{o.nomorRfq}</span></div>
      <dl className="dl">
        <dt>Customer</dt><dd><strong>{o.customer.nama}</strong> <span className="small muted">({LABEL_CUSTOMER[o.customer.jenis]}) · PIC {o.customer.pic}{o.customer.telepon ? ` · ${o.customer.telepon}` : ''}</span></dd>
        <dt>Layanan</dt><dd>{LAYANAN[o.jenis].label}</dd>
        <dt>Kebutuhan</dt><dd>{o.deskripsi}</dd>
        <dt>Jadwal</dt><dd>{tanggalDb(o.tglMulai)} – {tanggalDb(o.tglSelesai)}</dd>
        <dt>Lokasi</dt><dd>{o.lokasi}</dd>
        {o.jumlahPeserta != null && <><dt>{o.jenis === 'SEWA_RUANG' ? 'Pengguna' : 'Peserta'}</dt><dd className="num">{o.jumlahPeserta} orang</dd></>}
        {LAYANAN[o.jenis].atribut.filter(a => detail[a.key]).map(a => (
          <div key={a.key} style={{ display: 'contents' }}>
            <dt>{a.label.replace(/ \(.*\)$/, '')}</dt>
            <dd>{a.tipe === 'number' ? rupiah(detail[a.key]) : detail[a.key]}</dd>
          </div>
        ))}
        <dt>Marketing</dt><dd>{o.marketing.nama}</dd>
        {o.unit && <><dt>UPT/Prodi</dt><dd>{o.unit.nama}</dd></>}
      </dl>
      {o.alasanTutup && <p className="banner bad small"><strong>{o.status === 'BATAL' ? 'Dibatalkan:' : 'Tidak sanggup:'}</strong>{o.alasanTutup}</p>}
    </section>
  );
}

// ---------- Tahap 1: analisis & silabus/RAK ----------

export function PanelAnalisis({ o, u, units }: P & { units: Unit[] }) {
  if (!ya(u, Peran.marketing) || !di(o, StatusOrder.RFQ)) return null;
  return (
    <section className="card highlight" aria-labelledby="h-analisis">
      <div className="card-head"><h2 id="h-analisis">Analisis kesanggupan</h2></div>
      <Form action={A.analisis.bind(null, o.id)} className="stack">
        <div className="choice">
          <label><input type="radio" name="sanggup" value="ya" required /> <span><strong>Sanggup</strong><span className="small muted">Minta Silabus & RAK ke DPS</span></span></label>
          <label><input type="radio" name="sanggup" value="tidak" /> <span><strong>Tidak sanggup</strong><span className="small muted">Order ditutup dengan alasan</span></span></label>
        </div>
        <div className="jika-ya grid-2 tight">
          <label>UPT/Prodi yang diusulkan
            <select name="unitId" defaultValue=""><option value="" disabled>Pilih UPT/Prodi</option>{units.map(x => <option key={x.id} value={x.id}>{x.nama}</option>)}</select>
          </label>
          <label>Catatan untuk DPS/UPT<input name="catatan" /></label>
        </div>
        <label className="jika-tidak">Alasan tidak sanggup<textarea name="alasan" rows={2} /></label>
        <div className="form-actions start"><Submit>Simpan hasil analisis</Submit></div>
      </Form>
    </section>
  );
}

export function SeksiSilabus({ o, u, units, pengajar }: P & { units: Unit[]; pengajar: (User & { unit: Unit | null })[] }) {
  const s = o.silabus;
  if (!s) return null;
  const rak = totalRak(o.rakItem);
  const dpsBoleh = ya(u, Peran.dps) && di(o, StatusOrder.SILABUS_RAK) && !s.diteruskanPada;
  const uptBoleh = ya(u, Peran.upt) && di(o, StatusOrder.SILABUS_RAK) && !!s.diteruskanPada && o.unitId === u.unitId;
  return (
    <section className={`card${dpsBoleh || uptBoleh ? ' highlight' : ''}`} aria-labelledby="h-silabus">
      <div className="card-head">
        <h2 id="h-silabus">Silabus & RAK</h2>
        <span className="small muted">Tenggat {tanggalDb(s.tenggat)}</span>
      </div>
      <ol className="mini-alur">
        <li className="done">Diminta Marketing</li>
        <li className={s.diteruskanPada ? 'done' : 'now'}>{s.diteruskanPada ? `Diteruskan DPS ${waktu(s.diteruskanPada)}` : 'Menunggu DPS meneruskan'}</li>
        <li className={s.dikirimPada ? 'done' : s.diteruskanPada ? 'now' : ''}>{s.dikirimPada ? `Dikirim UPT ${waktu(s.dikirimPada)}` : `Disusun ${o.unit?.nama ?? 'UPT'}`}</li>
      </ol>
      {s.catatanMarketing && <p className="small"><strong>Catatan Marketing:</strong> {s.catatanMarketing}</p>}

      {dpsBoleh && (
        <Form action={A.teruskanKeUpt.bind(null, o.id)} className="form-inline">
          <label className="sr-only" htmlFor="unit-tujuan">UPT tujuan</label>
          <select id="unit-tujuan" name="unitId" defaultValue={o.unitId ?? ''}>{units.map(x => <option key={x.id} value={x.id}>{x.nama}</option>)}</select>
          <Submit>Teruskan ke UPT</Submit>
        </Form>
      )}

      {s.dikirimPada && (
        <>
          <p>{s.ringkasan}</p>
          <p className="small">Dokumen Silabus/RPS: <Lampiran nama={s.berkas} /></p>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Uraian RAK</th><th className="num">Vol</th><th>Satuan</th><th className="num">Harga satuan</th><th className="num">Jumlah</th></tr></thead>
              <tbody>
                {o.rakItem.map(i => (
                  <tr key={i.id}><td>{i.uraian}</td><td className="num">{i.volume}</td><td>{i.satuan}</td><td className="num">{rupiah(i.hargaSatuan)}</td><td className="num">{rupiah(i.volume * Number(i.hargaSatuan))}</td></tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={4}><strong>Total RAK</strong></td><td className="num"><strong>{rupiah(rak)}</strong></td></tr></tfoot>
            </table>
          </div>
        </>
      )}

      {uptBoleh && (
        <Form action={A.kirimSilabusRak.bind(null, o.id)} className="stack">
          <label>Ringkasan silabus / RPS<textarea name="ringkasan" rows={3} required defaultValue={s.ringkasan ?? ''} /></label>
          <label>Dokumen Silabus / RPS<input type="file" name="berkas" accept=".pdf,.jpg,.jpeg,.png" /><span className="hint">PDF/JPG/PNG, maks. 2 MB</span></label>
          <RakInput awal={o.rakItem.map(i => ({ uraian: i.uraian, volume: String(i.volume), satuan: i.satuan, hargaSatuan: String(Number(i.hargaSatuan)) }))} />
          <fieldset>
            <legend>Usulan pengajar yang tersedia {tanggalDb(o.tglMulai)} – {tanggalDb(o.tglSelesai)}</legend>
            <ul className="staff-pick">
              {pengajar.map(p => (
                <li key={p.id}><label><input type="checkbox" name="pengajar" value={p.id} /> <span className="grow"><strong>{p.nama}</strong> <span className="small muted">{p.eksternal ? 'Eksternal' : p.unit?.nama} · {p.jabatan}</span></span></label></li>
              ))}
            </ul>
          </fieldset>
          <div className="form-actions start"><Submit>Kirim Silabus & RAK ke Marketing</Submit></div>
        </Form>
      )}
    </section>
  );
}

// ---------- Tahap 2: quotation & PO ----------

export function SeksiKomersial({ o, u }: P) {
  const rak = totalRak(o.rakItem);
  const aktif = ya(u, Peran.marketing) && di(o, StatusOrder.QUOTATION);
  if (!o.quotation.length && !aktif) return null;
  const terkirim = o.quotation.find(q => q.status === StatusQuotation.DIKIRIM);
  const besok = ymd(new Date(Date.now() + 14 * HARI));
  return (
    <section className={`card${aktif ? ' highlight' : ''}`} aria-labelledby="h-quotation">
      <div className="card-head"><h2 id="h-quotation">Proposal, Quotation & PO</h2></div>
      {o.quotation.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Quotation</th><th className="num">RAK</th><th className="num">Margin</th><th className="num">Penawaran</th><th>Berlaku</th><th>Status</th><th /></tr></thead>
            <tbody>
              {o.quotation.map(q => (
                <tr key={q.id} className={q.status === 'DIGANTI' ? 'inactive' : ''}>
                  <td><strong>{q.nomor}</strong><br /><span className="small muted">versi {q.versi}</span></td>
                  <td className="num">{rupiah(q.nilaiRak)}</td>
                  <td className="num">{Number(q.marginPersen).toFixed(1)}%</td>
                  <td className="num"><strong>{rupiah(q.nilaiPenawaran)}</strong></td>
                  <td className="small">{tanggalDb(q.berlakuSampai)}</td>
                  <td className="small">{{ DIKIRIM: 'Dikirim ke customer', DISETUJUI: 'Disetujui customer', DITOLAK: 'Ditolak customer', DIGANTI: 'Diganti versi baru' }[q.status]}</td>
                  <td><Link className="btn btn-ghost btn-small" href={`/cetak/quotation/${q.id}`} target="_blank">Cetak</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {o.po && (
        <dl className="dl">
          <dt>{o.po.jenis === JenisPo.PO ? 'Purchase Order' : 'Approval quotation'}</dt><dd><strong>{o.po.nomor}</strong> · {tanggalDb(o.po.tanggal)}</dd>
          <dt>Nilai</dt><dd className="num">{rupiah(o.po.nilai)}</dd>
          <dt>Dokumen</dt><dd><Lampiran nama={o.po.lampiran} /></dd>
        </dl>
      )}
      {aktif && (
        <>
          <details open={!terkirim}>
            <summary className="small">{terkirim ? 'Revisi quotation (versi baru)' : 'Susun quotation'}</summary>
            <Form action={A.buatQuotation.bind(null, o.id)} className="stack">
              <MarginInput rak={rak} />
              <div className="grid-2 tight">
                <label>Berlaku sampai<input type="date" name="berlakuSampai" defaultValue={besok} min={ymd()} required /></label>
                <label>Catatan penawaran<input name="catatan" placeholder="mis. Termasuk modul & sertifikat" /></label>
              </div>
              <div className="form-actions start"><Submit>Terbitkan quotation</Submit></div>
            </Form>
          </details>
          {terkirim && (
            <div className="grid-2">
              <Form action={A.rekamPo.bind(null, o.id)} className="stack">
                <h3 className="small">Customer setuju → rekam PO</h3>
                <label>Jenis dokumen
                  <select name="jenis" defaultValue="PO"><option value="PO">Purchase Order</option><option value="APPROVAL_QUOTATION">Approval quotation tertulis</option></select>
                </label>
                <div className="grid-2 tight">
                  <label>Nomor<input name="nomor" required /></label>
                  <label>Tanggal<input type="date" name="tanggal" max={ymd()} required /></label>
                </div>
                <label>Nilai (Rp)<input name="nilai" inputMode="numeric" defaultValue={String(Number(terkirim.nilaiPenawaran))} required /></label>
                <label>Dokumen PO<input type="file" name="lampiran" accept=".pdf,.jpg,.jpeg,.png" /><span className="hint">Wajib untuk PO</span></label>
                <div className="form-actions start"><Submit>Rekam PO</Submit></div>
              </Form>
              <Form action={A.batalkan.bind(null, o.id)} className="stack" confirm="Batalkan order ini?">
                <h3 className="small">Customer menolak penawaran</h3>
                <label>Alasan<textarea name="alasan" rows={3} required /></label>
                <div className="form-actions start"><Submit className="btn btn-danger">Batalkan order</Submit></div>
              </Form>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ---------- Tahap 3: SPK & approval berjenjang ----------

export function SeksiSpk({ o, u }: P) {
  const spk = o.spk;
  const draf = ya(u, Peran.marketing) && di(o, StatusOrder.SPK_DRAF);
  const approver = (ya(u, Peran.kadep_marketing) && di(o, StatusOrder.APPROVAL_1)) || (ya(u, Peran.kadep_dps) && di(o, StatusOrder.APPROVAL_2));
  if (!spk && !draf) return null;
  const rak = totalRak(o.rakItem);
  return (
    <section className={`card${draf || approver ? ' highlight' : ''}`} aria-labelledby="h-spk">
      <div className="card-head">
        <h2 id="h-spk">Surat Perintah Kerja</h2>
        {spk && <Link href={`/cetak/spk/${spk.id}`} target="_blank">{spk.nomor ? 'Cetak SPK' : 'Pratinjau draf'}</Link>}
      </div>
      {spk?.alasanTolak && di(o, StatusOrder.SPK_DRAF) && <p className="banner bad small"><strong>Ditolak:</strong>{spk.alasanTolak}</p>}
      {spk && (
        <>
          <dl className="dl">
            <dt>Nomor</dt><dd>{spk.nomor ?? <span className="muted">Terbit setelah approval 2</span>}</dd>
            <dt>Nilai kontrak</dt><dd className="num">{rupiah(spk.nilaiKontrak)}</dd>
            <dt>Budget (RAK)</dt><dd className="num">{rupiah(spk.budgetRak)}</dd>
            <dt>Ruang lingkup</dt><dd>{spk.ruangLingkup}</dd>
            {spk.catatan && <><dt>Catatan</dt><dd>{spk.catatan}</dd></>}
          </dl>
          <ol className="approval">
            <li className={spk.approval1Pada ? 'done' : di(o, StatusOrder.APPROVAL_1) ? 'now' : ''}>
              <span className="peran">Approval 1 · Kadep Marketing</span>
              {spk.approval1Pada ? <span>{spk.approver1?.nama} · {waktu(spk.approval1Pada)}</span> : <span className="muted">Belum</span>}
            </li>
            <li className={spk.approval2Pada ? 'done' : di(o, StatusOrder.APPROVAL_2) ? 'now' : ''}>
              <span className="peran">Approval 2 · Kadep DPS</span>
              {spk.approval2Pada ? <span>{spk.approver2?.nama} · {waktu(spk.approval2Pada)}</span> : <span className="muted">Belum</span>}
            </li>
          </ol>
        </>
      )}
      {draf && (
        <Form action={A.simpanSpk.bind(null, o.id)} className="stack">
          <p className="small muted">Terisi otomatis: customer, jadwal, peserta, budget RAK {rupiah(rak)}, dan nilai kontrak {rupiah(o.po?.nilai)} dari PO.</p>
          <label>Ruang lingkup pekerjaan<textarea name="ruangLingkup" rows={4} required defaultValue={spk?.ruangLingkup ?? `${LAYANAN[o.jenis].label}: ${o.judul}. ${o.deskripsi}`} /></label>
          <label>Catatan (opsional)<input name="catatan" defaultValue={spk?.catatan ?? ''} /></label>
          <div className="form-actions start">
            <Submit name="aksi" value="ajukan">Simpan & ajukan approval</Submit>
            <Submit name="aksi" value="draf" className="btn btn-ghost">Simpan draf</Submit>
          </div>
        </Form>
      )}
      {approver && (
        <div className="grid-2">
          <Form action={A.setujuiSpk.bind(null, o.id)} className="stack" confirm="Setujui SPK ini?">
            <label>Catatan persetujuan (opsional)<input name="catatan" /></label>
            <div className="form-actions start"><Submit>{u.peran === Peran.kadep_dps ? 'Setujui & terbitkan nomor SPK' : 'Setujui (approval 1)'}</Submit></div>
          </Form>
          <Form action={A.tolakSpk.bind(null, o.id)} className="stack">
            <label>Alasan penolakan<textarea name="alasan" rows={2} required /></label>
            <div className="form-actions start"><Submit className="btn btn-danger">Tolak & kembalikan</Submit></div>
          </Form>
        </div>
      )}
    </section>
  );
}

// ---------- Tahap 4: persiapan operasional DPS ----------

export function SeksiOperasional({ o, u, pengajar, fasilitas, bentrok }: P & {
  pengajar: (User & { unit: Unit | null })[]; fasilitas: Fasilitas[]; bentrok: Record<number, string>;
}) {
  if (!di(o, StatusOrder.PERSIAPAN, StatusOrder.PELAKSANAAN, StatusOrder.LAPORAN, StatusOrder.SELESAI)) return null;
  const dps = ya(u, Peran.dps);
  const persiapan = di(o, StatusOrder.PERSIAPAN);
  const sudah = new Set(o.pengajar.filter(p => p.status !== StatusPengajar.USULAN && p.status !== StatusPengajar.MENOLAK).map(p => p.pengajarId));
  const usulan = o.pengajar.filter(p => p.status === StatusPengajar.USULAN);
  const kandidat = pengajar.filter(p => !sudah.has(p.id));
  const siap = o.pengajar.some(p => p.status === StatusPengajar.BERSEDIA && p.nomorSuratTugas);
  return (
    <section className={`card${dps && persiapan ? ' highlight' : ''}`} aria-labelledby="h-ops">
      <div className="card-head"><h2 id="h-ops">Persiapan operasional</h2><span className="small muted">pelaksanaan {tanggalDb(o.tglMulai)}</span></div>

      <h3 className="sub">Pengajar</h3>
      {usulan.length > 0 && <p className="small muted">Usulan UPT: {usulan.map(p => p.pengajar.nama).join(', ')}</p>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Pengajar</th><th>Peran</th><th>Status</th><th>Surat Tugas</th></tr></thead>
          <tbody>
            {o.pengajar.filter(p => p.status !== StatusPengajar.USULAN).map(p => (
              <tr key={p.id}>
                <td><strong>{p.pengajar.nama}</strong><br /><span className="small muted">{p.pengajar.eksternal ? 'Eksternal' : p.pengajar.unit?.nama}</span></td>
                <td>{p.peran}</td>
                <td><StatusPgj s={p.status} />{p.alasan && <div className="small muted">{p.alasan}</div>}</td>
                <td>
                  {p.nomorSuratTugas
                    ? <Link href={`/cetak/surat-tugas/${p.id}`} target="_blank">{p.nomorSuratTugas}</Link>
                    : dps && p.status === StatusPengajar.BERSEDIA && di(o, StatusOrder.PERSIAPAN, StatusOrder.PELAKSANAAN)
                      ? <Form action={A.terbitkanSuratTugas.bind(null, p.id)}><Submit className="btn btn-ghost btn-small">Terbitkan</Submit></Form>
                      : <span className="muted">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dps && persiapan && (
        <Form action={A.tetapkanPengajar.bind(null, o.id)} className="form-inline">
          <label className="sr-only" htmlFor="pgj">Pengajar</label>
          <select id="pgj" name="pengajarId" defaultValue={usulan[0]?.pengajarId ?? ''} required>
            <option value="" disabled>Pilih pengajar</option>
            {kandidat.map(p => (
              <option key={p.id} value={p.id}>{p.nama}{usulan.some(x => x.pengajarId === p.id) ? ' (usulan UPT)' : ''}{bentrok[p.id] ? ` — bentrok ${bentrok[p.id]}` : ''}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="pgj-peran">Peran</label>
          <input id="pgj-peran" name="peran" defaultValue="Instruktur" style={{ maxWidth: '12rem' }} />
          <Submit className="btn btn-ghost">Tetapkan</Submit>
        </Form>
      )}

      <h3 className="sub">Permintaan Pembelian (PP)</h3>
      {!o.pp.length && <p className="empty">Tidak ada pengadaan material.</p>}
      {o.pp.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Barang</th><th className="num">Jumlah</th><th className="num">Estimasi</th><th>Diajukan</th><th>Status</th></tr></thead>
            <tbody>
              {o.pp.map(p => (
                <tr key={p.id}>
                  <td>{p.item}</td>
                  <td className="num">{p.jumlah} {p.satuan}</td>
                  <td className="num">{rupiah(Number(p.estimasiHarga) * p.jumlah)}</td>
                  <td className="small">{tanggalDb(p.dibuatPada)} {ppMepet(p.dibuatPada, o.tglMulai) && <Peringatan>&lt; 14 hari</Peringatan>}</td>
                  <td>
                    {dps && persiapan ? (
                      <Form action={A.ubahStatusPp.bind(null, p.id)} className="form-inline">
                        <label className="sr-only" htmlFor={`pp-${p.id}`}>Status PP</label>
                        <select id={`pp-${p.id}`} name="status" defaultValue={p.status}>{Object.values(StatusPp).map(s => <option key={s} value={s}>{LABEL_PP[s]}</option>)}</select>
                        <Submit className="btn-text">Simpan</Submit>
                      </Form>
                    ) : LABEL_PP[p.status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dps && persiapan && (
        <Form action={A.tambahPp.bind(null, o.id)} className="step-form" reset>
          <label className="grow">Barang<input name="item" required /></label>
          <label>Jumlah<input name="jumlah" type="number" min={1} defaultValue={1} style={{ width: '5rem' }} required /></label>
          <label>Satuan<input name="satuan" defaultValue="pcs" style={{ width: '6rem' }} required /></label>
          <label>Harga satuan<input name="estimasiHarga" inputMode="numeric" style={{ width: '9rem' }} required /></label>
          <div style={{ alignSelf: 'flex-end' }}><Submit className="btn btn-ghost">Ajukan PP</Submit></div>
        </Form>
      )}

      <h3 className="sub">Fasilitas</h3>
      {!o.booking.length && <p className="empty">Belum ada booking ruang/lab.</p>}
      <ul className="list">
        {o.booking.map(b => (
          <li key={b.id} className="list-row">
            <span className="grow"><strong>{b.fasilitas.nama}</strong> <span className="small muted">kapasitas {b.fasilitas.kapasitas} · {tanggalDb(b.mulai)} – {tanggalDb(b.selesai)}</span></span>
            {dps && persiapan && <Form action={A.batalBooking.bind(null, b.id)} confirm="Batalkan booking?"><Submit className="btn-text">Batalkan</Submit></Form>}
          </li>
        ))}
      </ul>
      {dps && persiapan && (
        <Form action={A.bookingFasilitas.bind(null, o.id)} className="form-inline">
          <label className="sr-only" htmlFor="fas">Fasilitas</label>
          <select id="fas" name="fasilitasId" defaultValue="" required>
            <option value="" disabled>Pilih ruang / lab</option>
            {fasilitas.map(f => <option key={f.id} value={f.id}>{f.nama} ({f.kapasitas} org)</option>)}
          </select>
          <Submit className="btn btn-ghost">Booking</Submit>
        </Form>
      )}

      {dps && persiapan && (
        <Form action={A.mulaiPelaksanaan.bind(null, o.id)} className="form-actions start" confirm="Mulai pelaksanaan program?">
          <Submit>{siap ? 'Mulai pelaksanaan' : 'Mulai pelaksanaan (butuh Surat Tugas)'}</Submit>
        </Form>
      )}
    </section>
  );
}

// ---------- Tahap 5: laporan & BAST ----------

export function SeksiPenutupan({ o, u }: P) {
  const lapor = ya(u, Peran.dps) && di(o, StatusOrder.PELAKSANAAN);
  const bast = ya(u, Peran.marketing) && di(o, StatusOrder.LAPORAN);
  if (!o.laporan && !lapor) return null;
  return (
    <section className={`card${lapor || bast ? ' highlight' : ''}`} aria-labelledby="h-tutup">
      <div className="card-head"><h2 id="h-tutup">Laporan kegiatan & BAST</h2>{o.bast && <Link href={`/cetak/bast/${o.bast.id}`} target="_blank">Cetak BAST</Link>}</div>
      {o.laporan && (
        <dl className="dl">
          <dt>Laporan DPS</dt><dd>{o.laporan.ringkasan}</dd>
          {o.laporan.jumlahHadir != null && <><dt>Hadir</dt><dd className="num">{o.laporan.jumlahHadir} orang</dd></>}
          {o.laporan.kendala && <><dt>Kendala</dt><dd>{o.laporan.kendala}</dd></>}
          <dt>Lampiran</dt><dd><Lampiran nama={o.laporan.lampiran} /></dd>
          {o.bast && <><dt>BAST</dt><dd><strong>{o.bast.nomor}</strong> · {tanggalDb(o.bast.tanggal)}</dd></>}
        </dl>
      )}
      {lapor && (
        <Form action={A.kirimLaporan.bind(null, o.id)} className="stack">
          <label>Ringkasan pelaksanaan<textarea name="ringkasan" rows={3} required /></label>
          <div className="grid-2 tight">
            <label>Jumlah hadir<input type="number" name="jumlahHadir" min={0} /></label>
            <label>Lampiran laporan<input type="file" name="lampiran" accept=".pdf,.jpg,.jpeg,.png" /></label>
          </div>
          <label>Kendala (opsional)<textarea name="kendala" rows={2} /></label>
          <div className="form-actions start"><Submit>Kirim laporan ke Marketing</Submit></div>
        </Form>
      )}
      {bast && (
        <Form action={A.terbitkanBast.bind(null, o.id)} className="stack">
          <div className="grid-2 tight">
            <label>Tanggal serah terima<input type="date" name="tanggal" defaultValue={ymd()} required /></label>
            <label>Catatan<input name="catatan" placeholder="mis. Siap ditagihkan termin 100%" /></label>
          </div>
          <div className="form-actions start"><Submit>Terbitkan BAST & selesaikan order</Submit></div>
        </Form>
      )}
    </section>
  );
}

// ---------- Schedule Adjustment Log ----------

export function SeksiJadwal({ o, u }: P) {
  const boleh = ya(u, Peran.marketing, Peran.dps) && BOLEH_UBAH_JADWAL.includes(o.status);
  if (!boleh && !o.jadwalLog.length) return null;
  return (
    <section className="card" aria-labelledby="h-jadwal">
      <div className="card-head"><h2 id="h-jadwal">Perubahan jadwal</h2></div>
      {!o.jadwalLog.length && <p className="empty">Belum ada perubahan jadwal.</p>}
      <ul className="riwayat">
        {o.jadwalLog.map(j => (
          <li key={j.id}>
            <time>{waktu(j.dibuatPada)}</time>
            <span><strong>{j.oleh.nama}</strong>: {tanggalDb(j.mulaiLama)}–{tanggalDb(j.selesaiLama)} → <strong>{tanggalDb(j.mulaiBaru)}–{tanggalDb(j.selesaiBaru)}</strong> — {j.alasan}</span>
          </li>
        ))}
      </ul>
      {boleh && (
        <details>
          <summary className="small">Ubah jadwal</summary>
          <Form action={A.ubahJadwal.bind(null, o.id)} className="stack">
            <div className="grid-2 tight">
              <label>Mulai baru<input type="date" name="tglMulai" defaultValue={o.tglMulai.toISOString().slice(0, 10)} required /></label>
              <label>Selesai baru<input type="date" name="tglSelesai" defaultValue={o.tglSelesai.toISOString().slice(0, 10)} required /></label>
            </div>
            <label>Alasan (hasil negosiasi customer/pengajar)<input name="alasan" required /></label>
            <div className="form-actions start"><Submit className="btn btn-ghost">Simpan perubahan jadwal</Submit></div>
          </Form>
        </details>
      )}
    </section>
  );
}
