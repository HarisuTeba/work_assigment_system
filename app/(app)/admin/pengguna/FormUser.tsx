import type { Divisi, User } from '@prisma/client';
import { Form, Submit } from '@/components/Form';
import { simpanUser } from '@/app/actions/akun';
import { LABEL_PERAN } from '@/lib/format';

/** Form tambah/ubah pengguna. Batas KPI hanya berlaku untuk staff. */
export function FormUser({ user, divisi }: { user?: User; divisi: Divisi[] }) {
  return (
    <Form action={simpanUser.bind(null, user?.id ?? null)} className="stack" reset={!user}>
      <label>Nama lengkap<input name="nama" defaultValue={user?.nama} required maxLength={100} /></label>
      <div className="grid-2 tight">
        <label>Username<input name="username" defaultValue={user?.username} required maxLength={20} /></label>
        <label>Peran
          <select name="peran" defaultValue={user?.peran ?? 'staff'} required>
            {Object.entries(LABEL_PERAN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      <label>Jabatan<input name="jabatan" defaultValue={user?.jabatan} required maxLength={100} /></label>
      <div className="grid-2 tight">
        <label>Divisi
          <select name="divisiId" defaultValue={user?.divisiId ?? ''}>
            <option value="">— Tanpa divisi (admin) —</option>
            {divisi.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
          </select>
        </label>
        <label>Batas tugas aktif (KPI)
          <input type="number" name="batasTugasAktif" min={1} max={10} defaultValue={user?.batasTugasAktif ?? 3} />
          <span className="hint">Khusus staff. Melebihi batas → alert saat menerima perintah.</span>
        </label>
      </div>
      <label>{user ? 'Password baru (kosongkan bila tetap)' : 'Password'}
        <input type="password" name="password" autoComplete="new-password" minLength={6} required={!user} />
      </label>
      <div className="form-actions start"><Submit>{user ? 'Simpan perubahan' : 'Tambah pengguna'}</Submit></div>
    </Form>
  );
}
