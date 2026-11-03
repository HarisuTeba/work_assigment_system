import Link from 'next/link';

export default function TidakDitemukan() {
  return (
    <div className="kosong-hal">
      <div className="card">
        <div className="kosong-kode">404</div>
        <h1>Halaman tidak ditemukan</h1>
        <p className="muted">Data mungkin sudah dihapus, atau Anda tidak memiliki akses ke halaman ini.</p>
        <Link className="btn btn-primary" href="/">Kembali ke beranda</Link>
      </div>
    </div>
  );
}
