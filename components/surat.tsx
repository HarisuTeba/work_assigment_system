import { AksiPengesahan, JenisPerintah, StatusDokumen } from '@prisma/client';
import { Prio } from './badges';
import { LABEL_JENIS, namaTampil, rupiah, sisaWaktu, tanggalDb, waktu } from '@/lib/format';
import type { PerintahLengkap } from '@/lib/queries';

const STEMPEL: Partial<Record<StatusDokumen, [string, string]>> = {
  DRAF: ['Draf', 'muted'],
  MENUNGGU_PENGESAHAN: ['Menunggu pengesahan', 'muted'],
  DITOLAK: ['Ditolak', 'bad'],
  DISAHKAN: ['Disahkan', ''],
  DITURUNKAN: ['Disahkan', ''],
};

export function Lampiran({ nama, label }: { nama: string | null; label?: string }) {
  if (!nama) return <span className="muted">—</span>;
  return <a className="attach" href={`/berkas/${encodeURIComponent(nama)}`} target="_blank" rel="noopener">{label ?? namaTampil(nama)}</a>;
}

/** Lembar ISPK/SPK. `kepada` diisi bila surat dilihat dalam konteks satu penugasan. */
export function Memo({ pr, kepada, tag = 'h1' }: { pr: PerintahLengkap; kepada?: string; tag?: 'h1' | 'h2' }) {
  const [cap, kelas] = STEMPEL[pr.status] ?? ['', ''];
  const H = tag;
  return (
    <article className="memo" aria-labelledby={`judul-${pr.id}`}>
      <div className="memo-top">
        <div>
          <div className="memo-kind">{LABEL_JENIS[pr.jenis]}</div>
          <div className="memo-no">{pr.nomor ?? 'Nomor terbit setelah disahkan'}</div>
        </div>
        {cap && <span className="memo-stamp"><span className={`stamp ${kelas}`}>{cap}</span></span>}
      </div>
      <H className="memo-title" id={`judul-${pr.id}`}>{pr.judul}</H>
      <dl className="memo-fields">
        <div><dt>Dari</dt><dd>{pr.spv.nama}<br /><span className="muted small">{pr.spv.jabatan}</span></dd></div>
        <div><dt>Kepada</dt><dd>{kepada ?? <span className="muted">Staff {pr.divisi.nama}</span>}</dd></div>
        <div><dt>Prioritas</dt><dd><Prio p={pr.prioritas} /></dd></div>
        <div><dt>Tenggat</dt><dd>{waktu(pr.tenggat)}<br /><span className="muted small">{sisaWaktu(pr.tenggat)}</span></dd></div>
      </dl>
      {pr.jenis === JenisPerintah.SPK && (
        <dl className="memo-po" aria-label="Data Purchase Order">
          <div><dt>Nomor PO</dt><dd>{pr.noPo}</dd></div>
          <div><dt>Tanggal PO</dt><dd>{tanggalDb(pr.tglPo)}</dd></div>
          <div><dt>Klien</dt><dd>{pr.klien}</dd></div>
          <div><dt>Nilai PO</dt><dd className="num">{rupiah(pr.nilaiPo)}</dd></div>
          <div><dt>Dokumen PO</dt><dd><Lampiran nama={pr.lampiranPo} label="Lihat PO" /></dd></div>
        </dl>
      )}
      <dl className="w5-grid">
        <dt>Lingkup pekerjaan</dt><dd>{pr.apa}</dd>
        <dt>Tujuan</dt><dd>{pr.mengapa}</dd>
        <dt>Lokasi</dt><dd>{pr.diMana}</dd>
        <dt>Standar hasil</dt><dd>{pr.bagaimana}</dd>
        <dt>Langkah kerja</dt>
        <dd><ol className="plain-steps">{pr.langkah.map(l => <li key={l.id}>{l.deskripsi}</li>)}</ol></dd>
      </dl>
      <div className="memo-sign">
        <div><span className="peran">Diterbitkan</span><span className="ttd">{pr.spv.nama}</span><span className="muted">{pr.spv.jabatan}</span></div>
        <div>
          <span className="peran">Disahkan</span>
          {pr.disahkanPada && pr.manager
            ? <><span className="ttd">{pr.manager.nama}</span><span className="muted">{pr.manager.jabatan} · {waktu(pr.disahkanPada)}</span></>
            : <span className="ttd kosong">Belum disahkan Manager</span>}
        </div>
      </div>
    </article>
  );
}

/** Posisi dokumen dalam alur Draf → Diajukan → Disahkan → Diturunkan. */
export function AlurDokumen({ pr }: { pr: PerintahLengkap }) {
  const urut: StatusDokumen[] = [StatusDokumen.DRAF, StatusDokumen.MENUNGGU_PENGESAHAN, StatusDokumen.DISAHKAN, StatusDokumen.DITURUNKAN];
  const label = ['Draf disusun SPV', 'Diajukan ke Manager', 'Disahkan Manager', 'Diturunkan ke staff'];
  const ditolak = pr.status === StatusDokumen.DITOLAK;
  const posisi = ditolak ? 1 : urut.indexOf(pr.status);
  return (
    <ol className="alur" aria-label="Alur dokumen">
      {label.map((l, i) => {
        const kelas = ditolak && i === 2 ? 'bad' : i < posisi ? 'done' : i === posisi ? 'now' : '';
        return (
          <li key={l} className={kelas} aria-current={i === posisi ? 'step' : undefined}>
            {ditolak && i === 2 ? 'Ditolak Manager' : l}
            {ditolak && i === 2 && <small>Revisi lalu ajukan ulang</small>}
          </li>
        );
      })}
    </ol>
  );
}

const LABEL_AKSI: Record<AksiPengesahan, string> = { DIAJUKAN: 'mengajukan', DISAHKAN: 'mengesahkan', DITOLAK: 'menolak', DITURUNKAN: 'menurunkan ke' };

export function RiwayatPengesahan({ pr }: { pr: PerintahLengkap }) {
  if (!pr.riwayat.length) return <p className="empty">Belum pernah diajukan.</p>;
  return (
    <ul className="riwayat">
      {pr.riwayat.map(r => (
        <li key={r.id}>
          <time>{waktu(r.dibuatPada)}</time>
          <span>
            <strong>{r.oleh.nama}</strong>{' '}
            <span className={r.aksi === AksiPengesahan.DITOLAK ? 'bad' : ''}>{LABEL_AKSI[r.aksi]}</span>
            {r.aksi === AksiPengesahan.DITURUNKAN ? ` ${r.catatan}` : r.catatan ? <> — <q>{r.catatan}</q></> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
