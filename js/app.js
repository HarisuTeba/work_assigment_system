// Router berbasis hash, layout, dan delegasi event.

const ROUTES = [
  { path: /^\/dashboard$/, page: 'dashboard', peran: ['admin', 'atasan', 'bawahan'] },
  { path: /^\/profil$/, page: 'profil', peran: ['admin', 'atasan', 'bawahan'] },
  { path: /^\/notifikasi$/, page: 'notifikasi', peran: ['admin', 'atasan', 'bawahan'] },
  { path: /^\/peringkat$/, page: 'peringkat', peran: ['atasan', 'bawahan'] },
  { path: /^\/admin\/divisi$/, page: 'divisi', peran: ['admin'] },
  { path: /^\/admin\/pengguna$/, page: 'pengguna', peran: ['admin'] },
  { path: /^\/perintah\/baru$/, page: 'buatPerintah', peran: ['atasan'] },
  { path: /^\/perintah\/(\d+)$/, page: 'detailPerintah', peran: ['atasan'] },
  { path: /^\/perintah$/, page: 'daftarPerintah', peran: ['atasan'] },
  { path: /^\/penugasan\/(\d+)$/, page: 'penugasanAtasan', peran: ['atasan'] },
  { path: /^\/evaluasi$/, page: 'evaluasi', peran: ['atasan'] },
  { path: /^\/reward$/, page: 'reward', peran: ['atasan'] },
  { path: /^\/teguran$/, page: 'teguran', peran: ['atasan'] },
  { path: /^\/tugas\/(\d+)$/, page: 'kerjakan', peran: ['bawahan'] },
  { path: /^\/tugas$/, page: 'kotakMasuk', peran: ['bawahan'] },
  { path: /^\/nilai$/, page: 'nilai', peran: ['bawahan'] },
  { path: /^\/teguran-saya$/, page: 'teguranSaya', peran: ['bawahan'] },
];

const NAV = {
  admin: [
    ['/dashboard', 'Dashboard'],
    ['/admin/divisi', 'Divisi'],
    ['/admin/pengguna', 'Pengguna'],
  ],
  atasan: [
    ['/dashboard', 'Dashboard'],
    ['/perintah/baru', 'Buat Perintah'],
    ['/perintah', 'Daftar Perintah'],
    ['/evaluasi', 'Evaluasi'],
    ['/reward', 'Reward'],
    ['/teguran', 'Teguran'],
    ['/peringkat', 'Peringkat'],
  ],
  bawahan: [
    ['/dashboard', 'Dashboard'],
    ['/tugas', 'Kotak Masuk'],
    ['/nilai', 'Nilai & Reward'],
    ['/teguran-saya', 'Teguran Saya'],
    ['/peringkat', 'Peringkat'],
  ],
};

// Angka kecil di menu: hal yang menunggu tindakan.
function hitungBadgeNav(user, path) {
  if (user.peran === 'atasan') {
    const pen = Logic.penugasanAtasan(user);
    if (path === '/evaluasi') return pen.filter(p => p.status === STATUS.DILAPORKAN).length;
    if (path === '/perintah') return pen.reduce((n, p) => n + Logic.pertanyaanTerbuka(p.id).length, 0);
    if (path === '/teguran') return Logic.saranTeguran(user).length;
  }
  if (user.peran === 'bawahan') {
    if (path === '/tugas') return Logic.penugasanBawahan(user).filter(p => [STATUS.BARU, STATUS.REVISI].includes(p.status)).length;
    if (path === '/teguran-saya') return Store.where('teguran', t => t.penerima_id === user.id && !t.dibaca_pada).length;
  }
  return 0;
}

const App = {
  user: null,

  start() {
    Store.load();
    window.addEventListener('hashchange', () => this.render());
    document.addEventListener('click', e => this.onClick(e));
    document.addEventListener('submit', e => this.onSubmit(e));
    document.addEventListener('change', e => this.onChange(e));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    this.render();
  },

  render() {
    closeModal();
    document.body.classList.remove('nav-open');
    Logic.refreshTerlambat();
    const uid = Session.get();
    this.user = uid ? Store.get('users', uid) : null;
    if (this.user && !this.user.aktif) { Session.clear(); this.user = null; }

    const root = document.getElementById('app');
    if (!this.user) {
      document.title = 'Masuk · Sistem Perintah & Tugas';
      root.innerHTML = Pages.login.render();
      return;
    }

    const path = location.hash.replace(/^#/, '') || '/dashboard';
    let route = null;
    let params = [];
    for (const r of ROUTES) {
      const m = path.match(r.path);
      if (m && r.peran.includes(this.user.peran)) { route = r; params = m.slice(1); break; }
    }
    if (!route) { location.replace('#/dashboard'); return; }

    const page = Pages[route.page];
    let isi;
    let gagalMuat = false;
    try {
      isi = page.render(this.user, params);
    } catch (e) {
      if (!(e instanceof ValidasiError)) throw e;
      gagalMuat = true;
      isi = `<section class="card">${kosong(e.message)}<div class="form-actions start"><a href="#/dashboard" class="btn btn-ghost">Kembali ke dashboard</a></div></section>`;
    }
    const judul = gagalMuat ? 'Tidak ditemukan'
      : route.page === 'dashboard' ? `Dashboard ${PERAN[this.user.peran]}` : (page.title || '');
    document.title = `${judul} · Sistem Perintah & Tugas`;
    root.innerHTML = this.layout(path, judul, isi, !!page.surat && !gagalMuat);
    // Pindah halaman: ke atas. Render ulang setelah aksi: posisi scroll dipertahankan.
    if (path !== this.lastPath) window.scrollTo(0, 0);
    this.lastPath = path;
  },

  layout(path, judul, isi, halamanSurat) {
    const u = this.user;
    const unread = Store.where('notifikasi', n => n.user_id === u.id && !n.dibaca).length;
    // Item menu aktif: awalan path terpanjang yang cocok.
    const aktif = NAV[u.peran].map(n => n[0])
      .filter(p => path === p || path.startsWith(p + '/'))
      .sort((a, b) => b.length - a.length)[0]
      || (path.startsWith('/penugasan') ? '/perintah' : '');
    const menu = NAV[u.peran].map(([p, label]) => {
      const n = hitungBadgeNav(u, p);
      return `<a href="#${p}" class="nav-item${p === aktif ? ' active' : ''}"${p === aktif ? ' aria-current="page"' : ''}>
        <span class="grow">${label}</span>${n ? `<span class="nav-count" aria-label="${n} menunggu">${n}</span>` : ''}</a>`;
    }).join('');

    // Halaman surat (memo) menulis judulnya sendiri di dalam lembar surat.
    const kepala = halamanSurat ? '' : `<header class="page-head"><h1>${esc(judul)}</h1></header>`;

    return `<div class="shell">
      <aside class="sidebar">
        <a class="wordmark" href="#/dashboard">Perintah&amp;Tugas<span>Buku perintah kantor</span></a>
        <nav aria-label="Menu utama">${menu}</nav>
        <div class="sidebar-foot">
          <a href="#/profil" class="nav-item${path === '/profil' ? ' active' : ''}"><span class="grow">Profil</span></a>
          <button class="nav-item" data-action="logout"><span class="grow">Keluar</span></button>
        </div>
      </aside>
      <div class="nav-scrim" data-action="toggle-nav"></div>
      <div class="main">
        <header class="topbar">
          <button class="menu-btn" data-action="toggle-nav" aria-label="Buka menu">${IKON.menu}</button>
          <div class="dateline">${tanggalPanjang(now())}${u.divisi_id ? ` · Divisi ${esc(Logic.divisiNama(u.divisi_id))}` : ''}</div>
          <a href="#/notifikasi" class="bell" aria-label="Notifikasi${unread ? `, ${unread} belum dibaca` : ''}">${IKON.bel}${unread ? `<span class="bell-count">${unread}</span>` : ''}</a>
          <a href="#/profil" class="me-chip">${avatar(u)}<span class="me-text"><strong>${esc(u.nama)}</strong>
            <span class="muted small">${esc(u.jabatan)}</span></span></a>
        </header>
        ${Store.saveFailed ? '<div class="banner warn">Penyimpanan browser diblokir atau penuh. Perubahan hanya bertahan sampai halaman ditutup.</div>' : ''}
        <main class="content">${kepala}${isi}</main>
      </div>
    </div>`;
  },

  onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el || el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
    const fn = Actions[el.dataset.action];
    if (fn) fn(el, this.user, e);
  },

  onSubmit(e) {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const fn = Forms[form.dataset.form];
    if (fn) fn(form, this.user, formData(form));
  },

  onChange(e) {
    const el = e.target.closest('[data-change]');
    if (!el) return;
    const fn = Actions[el.dataset.change];
    if (fn) fn(el, this.user, e);
  },
};

App.start();
