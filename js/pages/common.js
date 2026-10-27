// Halaman dan komponen yang dipakai bersama semua peran.
// Pages.*.render() mengembalikan HTML; interaksi ditangani lewat
// data-action (klik) dan data-form (submit) yang dipetakan ke Actions/Forms.
const Pages = {};
const Actions = {};
const Forms = {};

// ---------- Komponen bersama ----------
// Perintah ditampilkan sebagai satu lembar Surat Perintah (5W1H).
// Bila `p` (penugasan) diberikan, lembar memuat cap status untuk penerima tersebut.
function kartuInstruksi(pr, p = null, tag = 'h1') {
  const pemberi = Store.get('users', pr.pemberi_id);
  const kepada = Logic.penugasanPerintah(pr.id).map(x => Store.get('users', x.penerima_id).nama).join(', ');
  const field = (label, isi) => `<div><dt>${label}</dt><dd>${isi}</dd></div>`;
  const baris = (label, sub, v) => `<dt>${label}<small>${sub}</small></dt><dd>${esc(v)}</dd>`;
  const cap = p ? stempel(p) : '';
  return `<article class="memo" aria-label="Surat perintah ${esc(pr.judul)}">
    ${cap ? `<div class="memo-stamp">${cap}</div>` : ''}
    <div class="memo-top"><div>
      <div class="memo-kind">Surat Perintah ${pr.jenis === 'Lisan' ? 'Lisan' : 'Tertulis'}</div>
      <div class="memo-no">No. ${nomorSurat(pr)}</div>
    </div></div>
    <${tag} class="memo-title">${esc(pr.judul)}</${tag}>
    <dl class="memo-fields">
      ${field('Dari', esc(pemberi ? pemberi.nama : '-'))}
      ${field('Kepada', esc(kepada))}
      ${field('Sifat', esc(pr.sifat))}
      ${field('Prioritas', badgePrioritas(pr.prioritas))}
      ${field('Tenggat', `${fmtWaktu(pr.tenggat)}${p && STATUS_SELESAI.includes(p.status) ? '' : `<div class="muted small">${sisaWaktu(pr.tenggat)}</div>`}`)}
    </dl>
    ${pr.jenis === 'Lisan' ? `<p class="memo-note"><strong>Catatan perintah lisan:</strong> ${esc(pr.catatan_lisan)}</p>` : ''}
    <dl class="w5-grid">
      ${baris('Apa', 'what', pr.apa)}
      ${baris('Mengapa', 'why', pr.mengapa)}
      ${baris('Di mana', 'where', pr.di_mana)}
      ${baris('Bagaimana', 'how', pr.bagaimana)}
    </dl>
    <p class="muted small">Diterbitkan ${fmtWaktu(pr.dibuat_pada)}. Siapa dan kapan tercantum pada kolom Kepada dan Tenggat.</p>
  </article>`;
}

// Thread tanya-jawab. Atasan bisa menjawab pertanyaan terbuka.
function threadTanya(p, viewer) {
  const list = Logic.pertanyaan(p.id);
  const penerima = Store.get('users', p.penerima_id);
  const pemberi = Store.get('users', Store.get('perintah', p.perintah_id).pemberi_id);
  const items = list.map(q => `<li class="qa">
      <div class="qa-q"><span class="who">${esc(penerima.nama)}</span> <span class="muted small">${fmtWaktu(q.ditanya_pada)}</span><p>${esc(q.isi)}</p></div>
      ${q.jawaban
        ? `<div class="qa-a"><span class="who">${esc(pemberi.nama)}</span> <span class="muted small">${fmtWaktu(q.dijawab_pada)}</span><p>${esc(q.jawaban)}</p></div>`
        : viewer.peran === 'atasan'
          ? `<form class="qa-a form-inline" data-form="jawab" data-id="${q.id}">
              <input name="jawaban" placeholder="Tulis jawaban…" required aria-label="Jawaban">
              <button class="btn btn-primary">Jawab</button></form>`
          : '<div class="qa-a muted">Menunggu jawaban atasan…</div>'}
    </li>`).join('');
  return `<section class="card">
    <div class="card-head"><h2>Tanya-jawab klarifikasi</h2></div>
    ${list.length ? `<ul class="qa-list">${items}</ul>` : kosong('Belum ada pertanyaan.')}
  </section>`;
}

function riwayatLaporan(p) {
  const list = Logic.laporan(p.id);
  if (!list.length) return '';
  return `<section class="card">
    <div class="card-head"><h2>Laporan akhir</h2></div>
    ${list.slice().reverse().map((l, i) => `<div class="report${i ? ' old' : ''}">
      <div class="muted">${i ? 'Laporan sebelumnya · ' : ''}Dikirim ${fmtWaktu(l.dikirim_pada)}</div>
      <p><strong>Hasil:</strong> ${esc(l.hasil)}</p>
      ${l.kendala ? `<p><strong>Kendala:</strong> ${esc(l.kendala)}</p>` : ''}
      ${l.lampiran ? `<p><strong>Lampiran:</strong> <a href="${esc(l.lampiran.data)}" download="${esc(l.lampiran.nama)}">${esc(l.lampiran.nama)}</a></p>` : ''}
    </div>`).join('')}
  </section>`;
}

function riwayatEvaluasi(p) {
  const list = Logic.evaluasi(p.id);
  if (!list.length) return '';
  return `<section class="card">
    <div class="card-head"><h2>Evaluasi atasan</h2></div>
    ${list.slice().reverse().map(e => `<div class="report">
      <div class="eval-head">
        ${badgeStatus(e.keputusan === 'setujui' ? STATUS.DISETUJUI : STATUS.REVISI)}
        <span class="muted">${fmtWaktu(e.dibuat_pada)} · rata-rata ${fmtSkor(Logic.skorRata(e))}</span>
      </div>
      <table class="mini"><tbody>
        <tr><td>Ketepatan waktu</td><td>${bintang(e.skor_waktu)}</td></tr>
        <tr><td>Kualitas hasil</td><td>${bintang(e.skor_kualitas)}</td></tr>
        <tr><td>Kesesuaian instruksi</td><td>${bintang(e.skor_kesesuaian)}</td></tr>
      </tbody></table>
      ${e.umpan_balik ? `<p><strong>Umpan balik:</strong> ${esc(e.umpan_balik)}</p>` : ''}
    </div>`).join('')}
  </section>`;
}

// Daftar langkah. Untuk bawahan, hanya langkah berikutnya yang bisa diselesaikan.
function daftarLangkah(p, bisaKerja) {
  const rows = Logic.progresPenugasan(p);
  const nextIdx = rows.findIndex(r => !r.progres.selesai);
  return `<ol class="steps">${rows.map((r, i) => {
    const st = r.progres.selesai ? 'done' : i === nextIdx ? 'next' : 'locked';
    let aksi = '';
    if (st === 'next' && bisaKerja) {
      aksi = `<form class="step-form" data-form="selesai-langkah" data-pid="${p.id}" data-lid="${r.langkah.id}">
        <input name="catatan" placeholder="Catatan singkat (opsional)" aria-label="Catatan langkah ${i + 1}">
        <button class="btn btn-primary">Tandai selesai</button></form>`;
    } else if (st === 'locked') {
      aksi = '<div class="small">Terkunci sampai langkah sebelumnya selesai</div>';
    }
    return `<li class="step step-${st}">
      <div class="step-num" aria-label="Langkah ${i + 1}${r.progres.selesai ? ', selesai' : ''}">${i + 1}</div>
      <div class="step-body">
        <div>${esc(r.langkah.deskripsi)}</div>
        ${r.progres.selesai ? `<div class="muted small">✓ Selesai ${fmtWaktu(r.progres.selesai_pada)}${r.progres.catatan ? ` · “${esc(r.progres.catatan)}”` : ''}</div>` : ''}
        ${aksi}
      </div></li>`;
  }).join('')}</ol>`;
}

function tabelPeringkat(divisiId, sorot) {
  const rows = Logic.peringkat(divisiId);
  if (!rows.length) return kosong('Belum ada anggota.');
  return `<div class="table-wrap"><table class="table">
    <thead><tr><th>#</th><th>Nama</th><th class="num">Poin</th><th class="num">Nilai rata-rata</th><th class="num">Tugas disetujui</th><th class="num">Sertifikat</th></tr></thead>
    <tbody>${rows.map((r, i) => `<tr${r.user.id === sorot ? ' class="me"' : ''}>
      <td><span class="rank">${i + 1}</span></td>
      <td>${esc(r.user.nama)}</td>
      <td class="num"><strong>${r.poin}</strong></td>
      <td class="num">${fmtSkor(r.nilai)}</td>
      <td class="num">${r.selesai}</td>
      <td class="num">${r.sertifikat || '–'}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

// ---------- Login ----------
Pages.login = {
  render() {
    const demo = [
      ['admin', 'Admin HR'],
      ['budi', 'Atasan Pemasaran'],
      ['siti', 'Staf Pemasaran'],
      ['dewi', 'Staf Pemasaran (perlu pembinaan)'],
      ['rina', 'Atasan Keuangan'],
      ['joko', 'Staf Keuangan'],
    ];
    const alur = [
      'Atasan menerbitkan perintah dengan instruksi 5W1H.',
      'Bawahan menyatakan paham atau bertanya dulu.',
      'Langkah dikerjakan satu per satu, lalu dilaporkan.',
      'Atasan menilai, memberi reward, atau membina.',
    ];
    return `<div class="login-wrap">
      <section class="login-intro">
        <span class="wordmark">Perintah&amp;Tugas<span>Buku perintah kantor</span></span>
        <h1>Perintah yang jelas, laporan yang tercatat.</h1>
        <p>Sistem pemberian perintah atasan ke bawahan, lengkap dengan konfirmasi, pelaporan, dan evaluasinya.</p>
        <ol>${alur.map((t, i) => `<li><b>${i + 1}</b><span>${t}</span></li>`).join('')}</ol>
      </section>
      <section class="login-form">
        <h2>Masuk</h2>
        <form data-form="login" class="stack">
          <label>Username<input name="username" autocomplete="username" required></label>
          <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
          <button class="btn btn-primary btn-block">Masuk</button>
        </form>
        <div>
          <p class="small muted">Akun demo, semua dengan password <code>${PASSWORD_DEMO}</code>. Klik untuk mengisi.</p>
          <div class="demo-list">${demo.map(([u, l]) => `<button class="demo-item" data-action="isi-demo" data-u="${u}"><strong>${u}</strong><span>${l}</span></button>`).join('')}</div>
        </div>
        <div><button class="btn-text" data-action="reset-demo">Reset data demo</button></div>
      </section></div>`;
  },
};

Forms.login = (form, _u, d) => {
  try {
    const u = Logic.login(d.username, d.password);
    Session.set(u.id);
    location.hash = '#/dashboard';
    App.render();
  } catch (e) {
    if (e instanceof ValidasiError) toast(e.message, 'error'); else throw e;
  }
};

Actions['isi-demo'] = el => {
  document.querySelector('[name=username]').value = el.dataset.u;
  document.querySelector('[name=password]').value = PASSWORD_DEMO;
};

Actions['reset-demo'] = () => {
  if (!confirm('Semua data akan dikembalikan ke data contoh awal. Lanjutkan?')) return;
  Store.reset();
  Session.clear();
  location.hash = '#/';
  toast('Data demo sudah direset.');
  App.render();
};

Actions.logout = () => {
  Session.clear();
  location.hash = '#/';
  App.render();
};

Actions['tutup-modal'] = (el, _u, e) => {
  // Klik di dalam kotak modal tidak menutupnya, kecuali tombol tutup.
  if (el.classList.contains('modal-backdrop') && e.target !== el) return;
  closeModal();
};

Actions['toggle-nav'] = () => document.body.classList.toggle('nav-open');

// ---------- Profil ----------
Pages.profil = {
  title: 'Profil',
  render(user) {
    return `<div class="grid-2">
      <section class="card">
        <div class="card-head"><h2>Data diri</h2></div>
        <dl class="dl">
          <dt>Nama</dt><dd>${esc(user.nama)}</dd>
          <dt>Username</dt><dd>${esc(user.username)}</dd>
          <dt>Peran</dt><dd>${PERAN[user.peran]}</dd>
          <dt>Jabatan</dt><dd>${esc(user.jabatan)}</dd>
          <dt>Divisi</dt><dd>${user.divisi_id ? esc(Logic.divisiNama(user.divisi_id)) : '-'}</dd>
        </dl>
      </section>
      <section class="card">
        <div class="card-head"><h2>Ganti password</h2></div>
        <form data-form="ganti-password" class="stack">
          <label>Password lama<input type="password" name="lama" required autocomplete="current-password"></label>
          <label>Password baru<input type="password" name="baru" required minlength="6" autocomplete="new-password"></label>
          <label>Ulangi password baru<input type="password" name="ulang" required autocomplete="new-password"></label>
          <button class="btn btn-primary">Simpan</button>
        </form>
      </section>
    </div>
    <section class="card">
      <div class="card-head"><h2>Data demo</h2></div>
      <p class="muted">Data tersimpan di browser ini (localStorage). Reset mengembalikan semua data ke contoh awal.</p>
      <div class="form-actions start"><button class="btn btn-danger" data-action="reset-demo">Reset data demo</button></div>
    </section>`;
  },
};

Forms['ganti-password'] = (form, user, d) =>
  jalankan(() => Logic.gantiPassword(user, d.lama, d.baru, d.ulang), 'Password diganti.');

// ---------- Notifikasi ----------
Pages.notifikasi = {
  title: 'Notifikasi',
  render(user) {
    const list = Store.where('notifikasi', n => n.user_id === user.id).sort((a, b) => b.dibuat_pada - a.dibuat_pada);
    return `<section class="card">
      <div class="card-head"><h2>Semua notifikasi</h2>
        ${list.some(n => !n.dibaca) ? '<button class="btn btn-ghost btn-small" data-action="baca-semua">Tandai semua dibaca</button>' : ''}</div>
      ${list.length ? `<ul class="notif-list">${list.map(n => `<li class="${n.dibaca ? '' : 'unread'}">
        <a href="${esc(n.tautan)}" data-action="buka-notif" data-id="${n.id}">
          <span>${esc(n.pesan)}</span><span class="muted small">${fmtWaktu(n.dibuat_pada)}</span></a></li>`).join('')}</ul>`
        : kosong('Belum ada notifikasi.')}
    </section>`;
  },
};

Actions['buka-notif'] = el => {
  const n = Store.get('notifikasi', Number(el.dataset.id));
  if (n) { n.dibaca = true; Store.save(); }
};

Actions['baca-semua'] = (el, user) => {
  Store.where('notifikasi', n => n.user_id === user.id).forEach(n => { n.dibaca = true; });
  Store.save();
  App.render();
};

// ---------- Peringkat ----------
Pages.peringkat = {
  title: 'Papan Peringkat',
  render(user) {
    return `<section class="card">
      <div class="card-head"><h2>Divisi ${esc(Logic.divisiNama(user.divisi_id))}</h2></div>
      <p class="muted small">Poin berasal dari evaluasi (rata-rata skor × 10, +10 jika tepat waktu) dan pujian atasan.</p>
      ${tabelPeringkat(user.divisi_id, user.id)}
    </section>`;
  },
};

Pages.dashboard = {
  title: 'Dashboard',
  render(user, params) {
    return { admin: Pages.dashAdmin, atasan: Pages.dashAtasan, bawahan: Pages.dashBawahan }[user.peran].render(user, params);
  },
};
