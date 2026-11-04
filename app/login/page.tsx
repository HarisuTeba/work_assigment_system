import type { Metadata } from 'next';
import { Form, Submit } from '@/components/Form';
import { login } from '@/app/actions/akun';

export const metadata: Metadata = { title: 'Masuk' };

const DEMO = [
  ['marketing', 'Marketing'],
  ['kadepmkt', 'Kadep Marketing'],
  ['dps', 'DPS'],
  ['kadepdps', 'Kadep DPS'],
  ['upt.inf', 'UPT / Prodi'],
  ['admin', 'Admin'],
];

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <section className="login-intro">
        <span className="wordmark"><span className="wm-logo" aria-hidden>S</span><span><strong>Sistem SPK</strong><small>Surat Perintah Kerja</small></span></span>
        <h1>Selamat datang</h1>
        <p>Masuk dengan akun Anda untuk melanjutkan.</p>
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
            {DEMO.map(([u, peran]) => (
              <div key={u} className="demo-item"><strong>{u}</strong><span>{peran}</span></div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
