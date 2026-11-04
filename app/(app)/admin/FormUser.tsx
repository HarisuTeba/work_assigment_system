import type { Unit, User } from '@prisma/client';
import { Form, Submit } from '@/components/Form';
import { simpanUser } from '@/app/actions/akun';
import { LABEL_PERAN } from '@/lib/format';

/** Form tambah/ubah pengguna. UPT/Prodi wajib untuk peran UPT. */
export function FormUser({ user, units }: { user?: User; units: Unit[] }) {
  return (
    <Form action={simpanUser.bind(null, user?.id ?? null)} className="stack" reset={!user}>
      <label>Nama lengkap<input name="nama" defaultValue={user?.nama} required maxLength={100} /></label>
      <div className="grid-2 tight">
        <label>Username<input name="username" defaultValue={user?.username} required maxLength={20} /></label>
        <label>Peran
          <select name="peran" defaultValue={user?.peran ?? 'marketing'} required>
            {Object.entries(LABEL_PERAN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>Jabatan<input name="jabatan" defaultValue={user?.jabatan} required maxLength={100} /></label>
        <label>UPT / Prodi
          <select name="unitId" defaultValue={user?.unitId ?? ''}>
            <option value="">— Tidak ada —</option>
            {units.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
          </select>
        </label>
      </div>
      <label>{user ? 'Password baru (kosongkan bila tetap)' : 'Password'}
        <input type="password" name="password" autoComplete="new-password" minLength={6} required={!user} />
      </label>
      <div className="form-actions start"><Submit>{user ? 'Simpan perubahan' : 'Tambah pengguna'}</Submit></div>
    </Form>
  );
}
