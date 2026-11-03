import { CetakTombol } from './CetakTombol';

/** Kop surat Politeknik Astra (teks; logo resmi bisa ditempel di area kiri). */
export function Kop({ judul, nomor, draf = false }: { judul: string; nomor: string | null; draf?: boolean }) {
  return (
    <>
      <div className="no-print cetak-bar"><CetakTombol /><span>Gunakan “Simpan sebagai PDF” pada dialog cetak.</span></div>
      {draf && <div className="watermark" aria-hidden>DRAF</div>}
      <header className="kop">
        <div className="kop-logo" aria-hidden>ASTRA<br />tech</div>
        <div>
          <div className="kop-nama">POLITEKNIK ASTRA</div>
          <div className="kop-unit">Direktorat 3 · Industrial Service</div>
          <div className="kop-alamat">Jl. Gaya Motor Raya No. 8, Sunter II, Jakarta Utara 14330 · (021) 651 9555</div>
        </div>
      </header>
      <h1 className="dok-judul">{judul}</h1>
      <p className="dok-nomor">Nomor: {nomor ?? '— (terbit setelah disetujui)'}</p>
    </>
  );
}

export function Ttd({ kiri, kanan }: { kiri: [string, string, string?]; kanan: [string, string, string?] }) {
  return (
    <div className="ttd">
      {[kiri, kanan].map(([peran, nama, ket], i) => (
        <div key={i}><span>{peran}</span><span className="ttd-ruang">{ket ?? ''}</span><strong>{nama}</strong></div>
      ))}
    </div>
  );
}
