'use client';

export function CetakTombol() {
  return <button type="button" className="btn btn-primary" onClick={() => window.print()}>Cetak / Simpan PDF</button>;
}
