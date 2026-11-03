import type { Metadata } from 'next';
import { Form, Submit } from '@/components/Form';
import { login } from '@/app/actions/akun';

export const metadata: Metadata = { title: 'Masuk' };

const DEMO = [
  ['admin', 'Admin', 'kelola divisi, akun, batas KPI'],
  ['hendra', 'Manager', 'sahkan / tolak ISPK & SPK'],
  ['budi', 'Supervisor', 'terbitkan dan turunkan perintah'],
  ['andi', 'Staff', 'AP harian, PICA, laporan akhir'],
  ['dewi', 'Staff', 'KPI penuh → alert saat menerima'],
];

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <section className="login-intro">
        <span className="wordmark" style={{ borderBottom: 0, padding: 0 }}>Perintah Kerja</span>
        <h1>Sistem Pemberian Perintah Kerja</h1>
        <p>Perintah kerja diterbitkan lewat ISPK atau SPK, disahkan Manager, lalu diturunkan ke staff dan dipantau sampai laporan akhir.</p>
        <ol>
          <li><b>1</b>SPV menerbitkan ISPK (proyek internal) atau SPK (proyek PO)</li>
          <li><b>2</b>Manager mengesahkan atau menolak dengan alasan</li>
          <li><b>3</b>Staff menerima atau menolak sesuai batas KPI</li>
          <li><b>4</b>Laporan harian lewat AP, mingguan dengan PICA</li>
          <li><b>5</b>Laporan akhir, evaluasi, dan poin</li>
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
