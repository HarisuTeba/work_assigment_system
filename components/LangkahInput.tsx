'use client';
import { useState } from 'react';

/** Daftar langkah kerja yang bisa ditambah/dihapus; dikirim sebagai banyak field "langkah". */
export function LangkahInput({ awal }: { awal: string[] }) {
  const [rows, setRows] = useState(() => (awal.length ? awal : ['']).map((v, i) => ({ id: i, v })));
  const [next, setNext] = useState(rows.length);
  const tambah = () => { setRows(r => [...r, { id: next, v: '' }]); setNext(n => n + 1); };
  return (
    <fieldset>
      <legend>Langkah kerja <span className="hint" style={{ display: 'inline' }}>— menjadi Action Plan awal staff</span></legend>
      <ol className="step-inputs">
        {rows.map((r, i) => (
          <li key={r.id} className="step-input">
            <label className="sr-only" htmlFor={`langkah-${r.id}`}>Langkah {i + 1}</label>
            <input
              id={`langkah-${r.id}`} name="langkah" defaultValue={r.v} maxLength={255} required={i === 0}
              placeholder={i === 0 ? 'mis. Kumpulkan data awal' : ''}
            />
            {rows.length > 1 && (
              <button type="button" className="btn-text" onClick={() => setRows(x => x.filter(y => y.id !== r.id))} aria-label={`Hapus langkah ${i + 1}`}>Hapus</button>
            )}
          </li>
        ))}
      </ol>
      <div><button type="button" className="btn btn-ghost btn-small" onClick={tambah}>+ Tambah langkah</button></div>
    </fieldset>
  );
}
