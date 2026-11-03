import { Form, Submit } from '@/components/Form';
import { gantiPassword } from '@/app/actions/akun';
import { LABEL_PERAN } from '@/lib/format';
import { wajibLogin } from '@/lib/session';

export const metadata = { title: 'Profil' };

export default async function ProfilPage() {
  const u = await wajibLogin();
  return (
    <>
      <div className="page-head"><h1>Profil</h1></div>
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Data akun</h2></div>
          <dl className="dl">
            <dt>Nama</dt><dd>{u.nama}</dd>
            <dt>Username</dt><dd>{u.username}</dd>
            <dt>Peran</dt><dd>{LABEL_PERAN[u.peran]}</dd>
            <dt>Jabatan</dt><dd>{u.jabatan}</dd>
            <dt>UPT / Prodi</dt><dd>{u.unit?.nama ?? '—'}</dd>
          </dl>
        </section>
        <section className="card">
          <div className="card-head"><h2>Ganti password</h2></div>
          <Form action={gantiPassword} className="stack" reset>
            <label>Password lama<input type="password" name="lama" autoComplete="current-password" required /></label>
            <label>Password baru<input type="password" name="baru" autoComplete="new-password" minLength={6} required /></label>
            <label>Ulangi password baru<input type="password" name="ulang" autoComplete="new-password" minLength={6} required /></label>
            <div className="form-actions start"><Submit>Simpan password</Submit></div>
          </Form>
        </section>
      </div>
    </>
  );
}
