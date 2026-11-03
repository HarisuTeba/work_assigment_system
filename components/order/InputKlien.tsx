'use client';
import { useState } from 'react';

const rp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
const angka = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0;

type Baris = { id: number; uraian: string; volume: string; satuan: string; hargaSatuan: string };

/** Tabel RAK per item dengan total berjalan. Dikirim sebagai field berulang uraian/volume/satuan/hargaSatuan. */
export function RakInput({ awal }: { awal: Omit<Baris, 'id'>[] }) {
  const [rows, setRows] = useState<Baris[]>(() =>
    (awal.length ? awal : [{ uraian: '', volume: '1', satuan: 'paket', hargaSatuan: '' }]).map((r, i) => ({ ...r, id: i })));
  const [next, setNext] = useState(rows.length);
  const ubah = (id: number, k: keyof Baris, v: string) => setRows(rs => rs.map(r => (r.id === id ? { ...r, [k]: v } : r)));
  const total = rows.reduce((a, r) => a + (Number(r.volume) || 0) * angka(r.hargaSatuan), 0);
  return (
    <fieldset>
      <legend>Rancangan Anggaran Kegiatan (RAK)</legend>
      <div className="table-wrap">
        <table className="table rak-input">
          <thead><tr><th>Uraian biaya</th><th>Vol</th><th>Satuan</th><th>Harga satuan (Rp)</th><th className="num">Jumlah</th><th /></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td><input name="uraian" aria-label={`Uraian ${i + 1}`} value={r.uraian} onChange={e => ubah(r.id, 'uraian', e.target.value)} /></td>
                <td><input name="volume" aria-label={`Volume ${i + 1}`} type="number" min={1} value={r.volume} onChange={e => ubah(r.id, 'volume', e.target.value)} style={{ width: '4.5rem' }} /></td>
                <td><input name="satuan" aria-label={`Satuan ${i + 1}`} value={r.satuan} onChange={e => ubah(r.id, 'satuan', e.target.value)} style={{ width: '6rem' }} /></td>
                <td><input name="hargaSatuan" aria-label={`Harga satuan ${i + 1}`} inputMode="numeric" value={r.hargaSatuan} onChange={e => ubah(r.id, 'hargaSatuan', e.target.value)} /></td>
                <td className="num small">{rp((Number(r.volume) || 0) * angka(r.hargaSatuan))}</td>
                <td>{rows.length > 1 && <button type="button" className="btn-text" onClick={() => setRows(rs => rs.filter(x => x.id !== r.id))}>Hapus</button>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={4}><strong>Total RAK</strong></td><td className="num"><strong>{rp(total)}</strong></td><td /></tr></tfoot>
        </table>
      </div>
      <div>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => { setRows(rs => [...rs, { id: next, uraian: '', volume: '1', satuan: 'paket', hargaSatuan: '' }]); setNext(n => n + 1); }}>
          + Tambah item
        </button>
      </div>
    </fieldset>
  );
}

/** Profit adjustment: isi margin % atau nilai penawaran; yang lain dihitung otomatis. */
export function MarginInput({ rak }: { rak: number }) {
  const [cara, setCara] = useState<'margin' | 'nilai'>('margin');
  const [margin, setMargin] = useState('50');
  const [nilai, setNilai] = useState(String(Math.round(rak * 1.5)));
  const nilaiHitung = cara === 'margin' ? Math.round(rak * (1 + (Number(margin) || 0) / 100)) : angka(nilai);
  const marginHitung = rak ? ((nilaiHitung - rak) / rak) * 100 : 0;
  return (
    <fieldset>
      <legend>Penyesuaian margin profit</legend>
      <input type="hidden" name="cara" value={cara} />
      <div className="choice">
        <label><input type="radio" checked={cara === 'margin'} onChange={() => setCara('margin')} /> <span><strong>Isi margin %</strong></span></label>
        <label><input type="radio" checked={cara === 'nilai'} onChange={() => setCara('nilai')} /> <span><strong>Isi nilai penawaran</strong></span></label>
      </div>
      <div className="grid-2 tight">
        {cara === 'margin'
          ? <label>Margin (%)<input name="margin" type="number" min={0} max={1000} step="0.1" value={margin} onChange={e => setMargin(e.target.value)} /></label>
          : <label>Nilai penawaran (Rp)<input name="nilai" inputMode="numeric" value={nilai} onChange={e => setNilai(e.target.value)} /></label>}
        <dl className="calc">
          <dt>Biaya RAK</dt><dd className="num">{rp(rak)}</dd>
          <dt>Margin</dt><dd className="num">{marginHitung.toFixed(1)}%</dd>
          <dt>Nilai penawaran</dt><dd className="num"><strong>{rp(nilaiHitung)}</strong></dd>
        </dl>
      </div>
    </fieldset>
  );
}
