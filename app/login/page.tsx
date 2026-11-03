import type { Metadata } from 'next';
import { Form, Submit } from '@/components/Form';
import { login } from '@/app/actions/akun';

export const metadata: Metadata = { title: 'Masuk' };

const DEMO = [
  ['marketing', 'Marketing', 'RFQ, quotation, PO, SPK, BAST'],
  ['kadepmkt', 'Kadep Marketing', 'approval 1 SPK'],
  ['dps', 'DPS', 'silabus ke UPT, pengajar, PP, fasilitas'],
  ['kadepdps', 'Kadep DPS', 'approval 2 SPK'],
  ['upt.inf', 'UPT Informatika', 'silabus, RAK, usulan pengajar'],
  ['rudi', 'Pengajar', 'konfirmasi penugasan'],
  ['admin', 'Admin', 'pengguna, master, SLA'],
];

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <section className="login-intro">
        <span className="wordmark" style={{ borderBottom: 0, padding: 0 }}>SPK · Direktorat 3</span>
        <h1>Sistem SPK Eksternal</h1>
        <p>Direktorat 3 Industrial Service · Politeknik Astra. Order training, konsultasi, dan sertifikasi dipantau dari RFQ sampai BAST.</p>
        <ol>
          <li><b>1</b>RFQ customer dan analisis kesanggupan</li>
          <li><b>2</b>Silabus & RAK dari DPS dan UPT/Prodi</li>
          <li><b>3</b>Quotation, lalu PO customer</li>
          <li><b>4</b>SPK disetujui Kadep Marketing dan Kadep DPS</li>
          <li><b>5</b>Persiapan, pelaksanaan, laporan, BAST</li>
        </ol>
      </section>
      <section className="login-form">
        <h2>Masuk</h2>
        <Form action={login} className="stack">
          <label>Username<input name="username" autoComplete="username" required autoFocus /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          <Submit className="btn btn-primary btn-block">Masuk</Submit>
        </Form>
        <div>
          <p className="small muted">Akun demo, password <code>demo123</code></p>
          <div className="demo-list">
            {DEMO.map(([u, peran, ket]) => (
              <div key={u} className="demo-item"><strong>{u}</strong><span>{peran} · {ket}</span></div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
