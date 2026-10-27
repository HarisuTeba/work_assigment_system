// Halaman Admin: kelola divisi dan pengguna.

Pages.dashAdmin = {
  render() {
    const users = Store.all('users');
    const hitung = peran => users.filter(u => u.peran === peran && u.aktif).length;
    const pen = Store.all('penugasan');
    return `<div class="stats">
        ${statCard('Divisi', Store.all('divisi').length, '', '#/admin/divisi')}
        ${statCard('Atasan aktif', hitung('atasan'), '', '#/admin/pengguna')}
        ${statCard('Bawahan aktif', hitung('bawahan'), '', '#/admin/pengguna')}
        ${statCard('Perintah dibuat', Store.all('perintah').length, `${pen.length} penugasan`)}
      </div>
      <section class="card">
        <div class="card-head"><h2>Ringkasan per divisi</h2></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Divisi</th><th>Atasan</th><th class="num">Staf</th><th class="num">Penugasan aktif</th><th class="num">Disetujui</th></tr></thead>
          <tbody>${Store.all('divisi').map(d => {
            const anggota = users.filter(u => u.divisi_id === d.id);
            const ids = new Set(anggota.map(u => u.id));
            const p = pen.filter(x => ids.has(x.penerima_id));
            return `<tr><td>${esc(d.nama)}</td>
              <td>${esc(anggota.filter(u => u.peran === 'atasan').map(u => u.nama).join(', ') || '-')}</td>
              <td class="num">${anggota.filter(u => u.peran === 'bawahan').length}</td>
              <td class="num">${p.filter(x => x.status !== STATUS.DISETUJUI).length}</td>
              <td class="num">${p.filter(x => x.status === STATUS.DISETUJUI).length}</td></tr>`;
          }).join('')}</tbody></table></div>
      </section>`;
  },
};

// ---------- Divisi ----------
Pages.divisi = {
  title: 'Kelola Divisi',
  render() {
    const list = Store.all('divisi');
    return `<section class="card">
      <div class="card-head"><h2>Daftar divisi</h2>
        <button class="btn btn-primary btn-small" data-action="form-divisi">Tambah divisi</button></div>
      ${list.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Nama</th><th class="num">Anggota</th><th></th></tr></thead>
        <tbody>${list.map(d => `<tr><td>${esc(d.nama)}</td>
          <td class="num">${Store.where('users', u => u.divisi_id === d.id).length}</td>
          <td class="actions"><button class="btn btn-ghost btn-small" data-action="form-divisi" data-id="${d.id}">Ubah</button>
            <button class="btn btn-ghost btn-small danger" data-action="hapus-divisi" data-id="${d.id}">Hapus</button></td></tr>`).join('')}
        </tbody></table></div>` : kosong('Belum ada divisi.')}
    </section>`;
  },
};

Actions['form-divisi'] = el => {
  const d = el.dataset.id ? Store.get('divisi', Number(el.dataset.id)) : null;
  openModal(d ? 'Ubah divisi' : 'Tambah divisi', `<form data-form="simpan-divisi" data-id="${d ? d.id : ''}" class="stack">
    <label>Nama divisi<input name="nama" value="${esc(d ? d.nama : '')}" required></label>
    <div class="form-actions"><button type="button" class="btn btn-ghost" data-action="tutup-modal">Batal</button>
      <button class="btn btn-primary">Simpan</button></div></form>`);
};

Forms['simpan-divisi'] = (form, user, d) =>
  jalankan(() => Logic.simpanDivisi(user, Number(form.dataset.id) || null, d.nama));

Actions['hapus-divisi'] = (el, user) => {
  if (!confirm('Hapus divisi ini?')) return;
  jalankan(() => Logic.hapusDivisi(user, Number(el.dataset.id)));
};

// ---------- Pengguna ----------
Pages.pengguna = {
  title: 'Kelola Pengguna',
  render() {
    const list = Store.all('users').slice().sort((a, b) =>
      (a.divisi_id || 0) - (b.divisi_id || 0) || a.peran.localeCompare(b.peran) || a.nama.localeCompare(b.nama));
    return `<section class="card">
      <div class="card-head"><h2>Daftar pengguna</h2>
        <button class="btn btn-primary btn-small" data-action="form-user">Tambah pengguna</button></div>
      <p class="muted small">Relasi atasan–bawahan ditentukan oleh divisi: atasan memberi perintah ke bawahan di divisinya.</p>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th>Jabatan</th><th>Divisi</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map(u => `<tr class="${u.aktif ? '' : 'inactive'}">
          <td>${esc(u.nama)}</td><td><code>${esc(u.username)}</code></td><td>${PERAN[u.peran]}</td>
          <td>${esc(u.jabatan)}</td><td>${u.divisi_id ? esc(Logic.divisiNama(u.divisi_id)) : '-'}</td>
          <td>${u.aktif ? '<span class="status s-aktif">Aktif</span>' : '<span class="status s-nonaktif">Nonaktif</span>'}</td>
          <td class="actions"><button class="btn btn-ghost btn-small" data-action="form-user" data-id="${u.id}">Ubah</button>
            <button class="btn btn-ghost btn-small" data-action="toggle-aktif" data-id="${u.id}">${u.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button></td>
        </tr>`).join('')}</tbody></table></div>
    </section>`;
  },
};

Actions['form-user'] = el => {
  const u = el.dataset.id ? Store.get('users', Number(el.dataset.id)) : null;
  const divisiOpsi = Store.all('divisi').map(d =>
    `<option value="${d.id}"${u && u.divisi_id === d.id ? ' selected' : ''}>${esc(d.nama)}</option>`).join('');
  openModal(u ? 'Ubah pengguna' : 'Tambah pengguna', `<form data-form="simpan-user" data-id="${u ? u.id : ''}" class="stack">
    <label>Nama lengkap<input name="nama" value="${esc(u ? u.nama : '')}" required></label>
    <label>Username<input name="username" value="${esc(u ? u.username : '')}" required pattern="[a-z0-9._]{3,20}"></label>
    <div class="grid-2 tight">
      <label>Peran<select name="peran" required>${Object.entries(PERAN).map(([k, v]) =>
        `<option value="${k}"${(u ? u.peran : 'bawahan') === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>Divisi<select name="divisi_id"><option value="">— (khusus admin) —</option>${divisiOpsi}</select></label>
    </div>
    <label>Jabatan<input name="jabatan" value="${esc(u ? u.jabatan : '')}" placeholder="mis. Staf Pemasaran" required></label>
    <label>${u ? 'Password baru (kosongkan jika tidak diganti)' : 'Password'}<input name="password" type="password" ${u ? '' : 'required'} minlength="6" autocomplete="new-password"></label>
    <div class="form-actions"><button type="button" class="btn btn-ghost" data-action="tutup-modal">Batal</button>
      <button class="btn btn-primary">Simpan</button></div></form>`);
};

Forms['simpan-user'] = (form, user, d) =>
  jalankan(() => Logic.simpanUser(user, Number(form.dataset.id) || null, d));

Actions['toggle-aktif'] = (el, user) => {
  const u = Store.get('users', Number(el.dataset.id));
  jalankan(() => Logic.setAktif(user, u.id, !u.aktif));
};
