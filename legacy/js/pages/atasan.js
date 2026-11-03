// Halaman Atasan: membuat perintah, memantau, mengevaluasi, reward, teguran.

const FilterPerintah = { status: '', penerima: '', prioritas: '' };

function namaUser(id) {
  const u = Store.get('users', id);
  return u ? u.nama : '-';
}

// ---------- Dashboard ----------
Pages.dashAtasan = {
  render(user) {
    const pen = Logic.penugasanAtasan(user);
    const aktif = pen.filter(p => p.status !== STATUS.DISETUJUI);
    const menungguEval = pen.filter(p => p.status === STATUS.DILAPORKAN);
    const tanyaTerbuka = pen.reduce((n, p) => n + Logic.pertanyaanTerbuka(p.id).length, 0);
    const terlambat = aktif.filter(p => p.terlambat);
    const saran = Logic.saranTeguran(user);

    // Penyelesaian per minggu: 6 minggu terakhir, berdasarkan tanggal disetujui.
    const disetujui = Store.where('evaluasi', e => e.keputusan === 'setujui' && pen.some(p => p.id === e.penugasan_id));
    const minggu = [];
    for (let i = 5; i >= 0; i--) {
      const akhir = now() - i * 7 * HARI;
      const awal = akhir - 7 * HARI;
      minggu.push({
        label: i === 0 ? 'Minggu ini' : `${fmtTanggal(awal).replace(/ \d{4}$/, '')}`,
        value: disetujui.filter(e => e.dibuat_pada > awal && e.dibuat_pada <= akhir).length,
      });
    }

    const perhatian = aktif
      .map(p => ({ p, pr: Store.get('perintah', p.perintah_id) }))
      .sort((a, b) => a.pr.tenggat - b.pr.tenggat)
      .slice(0, 6);

    return `<div class="stats">
        ${statCard('Penugasan aktif', aktif.length, '', '#/perintah')}
        ${statCard('Menunggu evaluasi', menungguEval.length, '', '#/evaluasi')}
        ${statCard('Pertanyaan terbuka', tanyaTerbuka, '', '#/perintah')}
        ${statCard('Terlambat', terlambat.length, '', '#/perintah')}
      </div>

      ${saran.length ? `<section class="card alert-card">
        <div class="card-head"><h2>Saran teguran</h2><a href="#/teguran">Kelola teguran</a></div>
        <ul class="list">${saran.map(s => `<li class="list-row">
          <div>${avatar(s.user)}</div>
          <div class="grow"><strong>${esc(s.user.nama)}</strong><div class="muted small">${esc(s.alasan.join(' · '))}</div></div>
          <button class="btn btn-small btn-warn" data-action="form-teguran" data-uid="${s.user.id}" data-tingkat="${s.saranTingkat}" data-alasan="${esc(s.alasan.join('; '))}">Beri teguran ${s.saranTingkat}</button>
        </li>`).join('')}</ul></section>` : ''}

      <div class="grid-2">
        <section class="card">
          <div class="card-head"><h2>Perlu perhatian</h2><a href="#/perintah/baru">Buat perintah</a></div>
          ${perhatian.length ? `<ul class="list">${perhatian.map(({ p, pr }) => `<li class="list-row">
            <a class="grow" href="#/penugasan/${p.id}"><strong>${esc(pr.judul)}</strong>
              <div class="muted small">${esc(namaUser(p.penerima_id))} · ${sisaWaktu(pr.tenggat)}</div></a>
            <div class="row-badges">${badgeStatus(p.status)}${badgeTerlambat(p)}</div></li>`).join('')}</ul>`
            : kosong('Tidak ada penugasan aktif.')}
        </section>
        <section class="card">
          <div class="card-head"><h2>Penugasan per status</h2></div>
          ${barChart(STATUS_URUT.map(s => ({ label: s, value: pen.filter(p => p.status === s).length })), { kosongPesan: 'Belum ada penugasan.' })}
        </section>
        <section class="card">
          <div class="card-head"><h2>Tugas disetujui per minggu</h2></div>
          ${columnChart(minggu)}
        </section>
        <section class="card">
          <div class="card-head"><h2>Nilai rata-rata per staf</h2></div>
          ${barChart(Logic.bawahanDari(user).map(b => ({ label: b.nama, value: Logic.rataNilai(b.id) })), { max: 5, format: v => v.toFixed(2) })}
        </section>
      </div>`;
  },
};

// ---------- Buat perintah ----------
function barisLangkah(nilai = '') {
  return `<li class="step-input"><input name="langkah[]" value="${esc(nilai)}" placeholder="Tuliskan satu langkah yang jelas" aria-label="Langkah">
    <button type="button" class="btn-text" data-action="hapus-langkah">Hapus</button></li>`;
}

Pages.buatPerintah = {
  title: 'Buat Perintah',
  render(user) {
    const bawahan = Logic.bawahanDari(user);
    const besok = new Date(now() + HARI);
    besok.setHours(17, 0, 0, 0);
    return `<form data-form="buat-perintah" class="stack-lg">
      <section class="card">
        <div class="card-head"><h2>1. Bentuk perintah</h2></div>
        <label>Judul perintah<input name="judul" maxlength="120" required placeholder="mis. Laporan penjualan bulanan November"></label>
        <div class="grid-3">
          <fieldset><legend>Jenis</legend>
            <label class="radio"><input type="radio" name="jenis" value="Tertulis" checked data-change="jenis-perintah"> Tertulis</label>
            <label class="radio"><input type="radio" name="jenis" value="Lisan" data-change="jenis-perintah"> Lisan, dicatat sebagai bukti</label></fieldset>
          <label>Sifat perintah<select name="sifat">${opsi(SIFAT, 'Perintah langsung')}</select></label>
          <label>Prioritas<select name="prioritas">${opsi(PRIORITAS, 'Sedang')}</select></label>
        </div>
        <label id="catatan-lisan" hidden>Catatan perintah lisan (bukti tertulis)
          <textarea name="catatan_lisan" rows="2" placeholder="Kapan dan di mana perintah lisan ini disampaikan, beserta poin pentingnya"></textarea></label>
      </section>

      <section class="card">
        <div class="card-head"><h2>2. Instruksi jelas (5W1H)</h2></div>
        <div class="grid-2">
          <label>Apa — tugas yang harus dikerjakan<textarea name="apa" rows="2" required></textarea></label>
          <label>Mengapa — tujuan / alasan<textarea name="mengapa" rows="2" required></textarea></label>
          <label>Di mana — lokasi / media<textarea name="di_mana" rows="2" required></textarea></label>
          <label>Bagaimana — cara & standar hasil<textarea name="bagaimana" rows="2" required></textarea></label>
          <label>Kapan — tenggat<input type="datetime-local" name="tenggat" value="${toLocalInput(besok.getTime())}" required></label>
          <fieldset><legend>Siapa — penerima (boleh lebih dari satu)</legend>
            ${bawahan.length ? bawahan.map(b => `<label class="check"><input type="checkbox" name="penerima[]" value="${b.id}"> ${esc(b.nama)}</label>`).join('')
              : '<p class="muted">Belum ada bawahan aktif di divisi Anda.</p>'}
          </fieldset>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h2>3. Langkah satu per satu</h2></div>
        <ol class="step-inputs" id="langkah-list">${barisLangkah()}${barisLangkah()}</ol>
        <button type="button" class="btn btn-ghost" data-action="tambah-langkah">Tambah langkah</button>
      </section>

      <div class="form-actions"><a class="btn btn-ghost" href="#/perintah">Batal</a>
        <button class="btn btn-primary">Kirim perintah</button></div>
    </form>`;
  },
};

Actions['tambah-langkah'] = () => {
  const list = document.getElementById('langkah-list');
  list.insertAdjacentHTML('beforeend', barisLangkah());
  list.lastElementChild.querySelector('input').focus();
};

Actions['hapus-langkah'] = el => {
  const list = document.getElementById('langkah-list');
  if (list.children.length > 1) el.closest('li').remove();
  else el.closest('li').querySelector('input').value = '';
};

Actions['jenis-perintah'] = el => {
  document.getElementById('catatan-lisan').hidden = el.value !== 'Lisan';
};

Forms['buat-perintah'] = (form, user, d) => {
  d.tenggat = d.tenggat ? new Date(d.tenggat).getTime() : 0;
  let pr;
  if (jalankan(() => { pr = Logic.buatPerintah(user, d); }, 'Perintah terkirim ke penerima.')) {
    location.hash = `#/perintah/${pr.id}`;
  }
};

// ---------- Daftar perintah ----------
function ringkasStatus(pen) {
  const hit = {};
  pen.forEach(p => { hit[p.status] = (hit[p.status] || 0) + 1; });
  return STATUS_URUT.filter(s => hit[s]).map(s =>
    `<span class="status s-${slug(s)}">${esc(s)}${hit[s] > 1 ? ` ×${hit[s]}` : ''}</span>`).join(' ');
}

Pages.daftarPerintah = {
  title: 'Daftar Perintah',
  render(user) {
    const f = FilterPerintah;
    const list = Store.where('perintah', pr => pr.pemberi_id === user.id)
      .map(pr => ({ pr, pen: Logic.penugasanPerintah(pr.id) }))
      .filter(({ pr, pen }) =>
        (!f.status || (f.status === 'Terlambat' ? pen.some(p => p.terlambat) : pen.some(p => p.status === f.status))) &&
        (!f.penerima || pen.some(p => p.penerima_id === Number(f.penerima))) &&
        (!f.prioritas || pr.prioritas === f.prioritas))
      .sort((a, b) => b.pr.dibuat_pada - a.pr.dibuat_pada);
    return `<section class="card">
      <div class="card-head"><h2>Perintah yang Anda terbitkan</h2><a class="btn btn-primary btn-small" href="#/perintah/baru">Buat perintah</a></div>
      <div class="filters">
        <label>Status<select data-change="filter-perintah" name="status"><option value="">Semua</option>${opsi([...STATUS_URUT, 'Terlambat'], f.status)}</select></label>
        <label>Penerima<select data-change="filter-perintah" name="penerima"><option value="">Semua</option>
          ${Logic.bawahanDari(user).map(b => `<option value="${b.id}"${String(b.id) === f.penerima ? ' selected' : ''}>${esc(b.nama)}</option>`).join('')}</select></label>
        <label>Prioritas<select data-change="filter-perintah" name="prioritas"><option value="">Semua</option>${opsi(PRIORITAS, f.prioritas)}</select></label>
      </div>
      ${list.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Perintah</th><th>Prioritas</th><th>Tenggat</th><th>Penerima</th><th>Status</th></tr></thead>
        <tbody>${list.map(({ pr, pen }) => `<tr class="clickable" data-action="buka" data-href="#/perintah/${pr.id}">
          <td><a href="#/perintah/${pr.id}"><strong>${esc(pr.judul)}</strong></a><div class="muted small">${nomorSurat(pr)}</div></td>
          <td>${badgePrioritas(pr.prioritas)}</td>
          <td>${fmtWaktu(pr.tenggat)}<div class="muted small">${sisaWaktu(pr.tenggat)}</div></td>
          <td>${pen.map(p => esc(namaUser(p.penerima_id))).join(', ')}</td>
          <td><div class="row-badges">${ringkasStatus(pen)}${pen.some(p => p.terlambat) ? badgeTerlambat({ terlambat: true }) : ''}</div></td>
        </tr>`).join('')}</tbody></table></div>` : kosong('Tidak ada perintah yang cocok dengan filter.')}
    </section>`;
  },
};

Actions['filter-perintah'] = el => {
  FilterPerintah[el.name] = el.value;
  App.render();
};

Actions.buka = (el, _u, e) => {
  if (e.target.closest('a, button')) return;
  location.hash = el.dataset.href;
};

// ---------- Detail perintah ----------
Pages.detailPerintah = {
  surat: true,
  render(user, [id]) {
    const pr = Logic.perintahMilikAtasan(user, Number(id));
    this.title = pr.judul;
    const pen = Logic.penugasanPerintah(pr.id);
    return `<a href="#/perintah" class="back">← Daftar perintah</a>
      ${kartuInstruksi(pr)}
      <section class="card">
        <div class="card-head"><h2>Progres per penerima</h2></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Penerima</th><th>Status</th><th>Progres</th><th class="num">Pertanyaan terbuka</th><th></th></tr></thead>
          <tbody>${pen.map(p => {
            const terbuka = Logic.pertanyaanTerbuka(p.id).length;
            const persen = Logic.persen(p);
            return `<tr class="clickable" data-action="buka" data-href="#/penugasan/${p.id}">
              <td>${esc(namaUser(p.penerima_id))}</td>
              <td><div class="row-badges">${badgeStatus(p.status)}${badgeTerlambat(p)}</div></td>
              <td class="progress-cell">${progressBar(persen)}<span class="small">${persen}%</span></td>
              <td class="num">${terbuka ? `<strong class="nav-count">${terbuka}</strong>` : '0'}</td>
              <td class="actions"><a class="btn btn-small ${p.status === STATUS.DILAPORKAN || terbuka ? 'btn-primary' : 'btn-ghost'}" href="#/penugasan/${p.id}">
                ${p.status === STATUS.DILAPORKAN ? 'Evaluasi' : terbuka ? 'Jawab' : 'Lihat'}</a></td></tr>`;
          }).join('')}</tbody></table></div>
      </section>
      <section class="card">
        <div class="card-head"><h2>Langkah yang harus dikerjakan berurutan</h2></div>
        <ol class="plain-steps">${Logic.langkahPerintah(pr.id).map(l => `<li>${esc(l.deskripsi)}</li>`).join('')}</ol>
      </section>`;
  },
};

// ---------- Penugasan (sudut pandang atasan) ----------
function formEvaluasi(p) {
  const langkah = Logic.langkahPerintah(p.perintah_id);
  const skor = (name, label) => `<fieldset class="score"><legend>${label}</legend>
    ${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="${name}" value="${n}" required><span>${n}</span></label>`).join('')}</fieldset>`;
  return `<section class="card highlight">
    <div class="card-head"><h2>Evaluasi laporan</h2></div>
    <form data-form="evaluasi" data-pid="${p.id}" class="stack">
      <div class="grid-3">
        ${skor('skor_waktu', 'Ketepatan waktu')}
        ${skor('skor_kualitas', 'Kualitas hasil')}
        ${skor('skor_kesesuaian', 'Kesesuaian instruksi')}
      </div>
      <label>Umpan balik / pembinaan<textarea name="umpan_balik" rows="3" placeholder="Apa yang sudah baik dan apa yang perlu ditingkatkan"></textarea></label>
      <fieldset><legend>Keputusan</legend>
        <label class="radio"><input type="radio" name="keputusan" value="setujui" required data-change="keputusan-eval"> Setujui — poin diberikan otomatis</label>
        <label class="radio"><input type="radio" name="keputusan" value="revisi" data-change="keputusan-eval"> Kembalikan untuk revisi</label>
      </fieldset>
      <label id="buka-mulai" hidden>Buka ulang langkah mulai dari
        <select name="buka_mulai"><option value="">Tidak ada (cukup perbaiki laporan)</option>
          ${langkah.map(l => `<option value="${l.urutan}">Langkah ${l.urutan}: ${esc(l.deskripsi)}</option>`).join('')}</select></label>
      <p class="hint">Poin = rata-rata skor × 10, ditambah 10 jika laporan dikirim sebelum tenggat.</p>
      <div class="form-actions"><button class="btn btn-primary">Simpan evaluasi</button></div>
    </form></section>`;
}

Actions['keputusan-eval'] = el => {
  document.getElementById('buka-mulai').hidden = el.value !== 'revisi';
};

// Garis waktu satu penugasan: diterima → dikonfirmasi → dilaporkan, terhadap tenggat.
function garisWaktu(p, pr) {
  const t = (label, ms) => `<span>${label}<strong>${ms ? fmtWaktu(ms) : '—'}</strong></span>`;
  return `<div class="timeline">${t('Diterima', p.dibuat_pada)}${t('Dikonfirmasi', p.dikonfirmasi_pada)}${t('Dilaporkan', p.dilaporkan_pada)}${t('Tenggat', pr.tenggat)}</div>`;
}

Pages.penugasanAtasan = {
  render(user, [id]) {
    const { p, pr } = Logic.penugasanMilikAtasan(user, Number(id));
    const penerima = Store.get('users', p.penerima_id);
    this.title = `${pr.judul} — ${penerima.nama}`;
    const persen = Logic.persen(p);
    return `<a href="#/perintah/${pr.id}" class="back">← Semua penerima perintah ini</a>
      <section class="card">
        <div class="card-head"><h2>Penugasan untuk ${esc(penerima.nama)}</h2>
          <div class="row-badges">${badgeStatus(p.status)}${badgeTerlambat(p)}</div></div>
        <div class="person-head">${avatar(penerima)}
          <div class="grow"><strong>${esc(penerima.nama)}</strong></div>
          <button class="btn btn-ghost btn-small" data-action="form-reward" data-uid="${penerima.id}">Beri reward</button>
          <button class="btn btn-warn btn-small" data-action="form-teguran" data-uid="${penerima.id}">Beri teguran</button>
        </div>
        <div class="progress-line">${progressBar(persen)}<span>${persen}% langkah selesai</span></div>
        ${garisWaktu(p, pr)}
      </section>
      ${p.status === STATUS.DILAPORKAN ? formEvaluasi(p) : ''}
      <div class="grid-2">
        <section class="card"><div class="card-head"><h2>Langkah</h2></div>${daftarLangkah(p, false)}</section>
        ${threadTanya(p, user)}
      </div>
      ${riwayatLaporan(p)}
      ${riwayatEvaluasi(p)}
      ${kartuInstruksi(pr, p, 'h2')}`;
  },
};

Forms.jawab = (form, user, d) =>
  jalankan(() => Logic.jawab(user, Number(form.dataset.id), d.jawaban));

Forms.evaluasi = (form, user, d) =>
  jalankan(() => Logic.evaluasiPenugasan(user, Number(form.dataset.pid), d),
    d.keputusan === 'setujui' ? 'Laporan disetujui, poin diberikan.' : 'Penugasan dikembalikan untuk revisi.');

// ---------- Evaluasi ----------
Pages.evaluasi = {
  title: 'Evaluasi',
  render(user) {
    const pen = Logic.penugasanAtasan(user);
    const menunggu = pen.filter(p => p.status === STATUS.DILAPORKAN);
    const selesai = Store.where('evaluasi', e => pen.some(p => p.id === e.penugasan_id))
      .sort((a, b) => b.dibuat_pada - a.dibuat_pada).slice(0, 15);
    return `<section class="card">
        <div class="card-head"><h2>Laporan menunggu evaluasi</h2></div>
        ${menunggu.length ? `<ul class="list">${menunggu.map(p => {
          const pr = Store.get('perintah', p.perintah_id);
          return `<li class="list-row"><a class="grow" href="#/penugasan/${p.id}"><strong>${esc(pr.judul)}</strong>
            <div class="muted small">${esc(namaUser(p.penerima_id))} · dilaporkan ${fmtWaktu(p.dilaporkan_pada)}</div></a>
            ${badgeTerlambat(p)}<a class="btn btn-primary btn-small" href="#/penugasan/${p.id}">Evaluasi</a></li>`;
        }).join('')}</ul>` : kosong('Tidak ada laporan yang menunggu evaluasi.')}
      </section>
      <section class="card">
        <div class="card-head"><h2>Riwayat evaluasi</h2></div>
        ${selesai.length ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Tanggal</th><th>Perintah</th><th>Staf</th><th class="num">Rata-rata</th><th>Keputusan</th></tr></thead>
          <tbody>${selesai.map(e => {
            const p = Store.get('penugasan', e.penugasan_id);
            const pr = Store.get('perintah', p.perintah_id);
            return `<tr class="clickable" data-action="buka" data-href="#/penugasan/${p.id}"><td>${fmtTanggal(e.dibuat_pada)}</td><td>${esc(pr.judul)}</td>
              <td>${esc(namaUser(p.penerima_id))}</td><td class="num">${fmtSkor(Logic.skorRata(e))}</td>
              <td>${e.keputusan === 'setujui' ? badgeStatus(STATUS.DISETUJUI) : badgeStatus(STATUS.REVISI)}</td></tr>`;
          }).join('')}</tbody></table></div>` : kosong('Belum ada evaluasi.')}
      </section>`;
  },
};

// ---------- Reward ----------
function opsiBawahan(user, terpilih) {
  return Logic.bawahanDari(user).map(b =>
    `<option value="${b.id}"${b.id === terpilih ? ' selected' : ''}>${esc(b.nama)}</option>`).join('');
}

function formRewardHtml(user, uid) {
  return `<form data-form="reward" class="stack">
    <label>Penerima<select name="penerima_id" required><option value="">Pilih staf</option>${opsiBawahan(user, uid)}</select></label>
    <fieldset><legend>Jenis reward</legend>
      <label class="radio"><input type="radio" name="jenis" value="pujian" checked data-change="jenis-reward"> Pujian dengan poin bonus</label>
      <label class="radio"><input type="radio" name="jenis" value="sertifikat" data-change="jenis-reward"> Sertifikat Karyawan Teladan</label></fieldset>
    <label id="poin-bonus">Poin bonus (0–20)<input type="number" name="poin" min="0" max="20" value="10"></label>
    <label>Pesan apresiasi<textarea name="pesan" rows="2" required placeholder="Sebutkan perilaku/hasil spesifik yang diapresiasi"></textarea></label>
    <div class="form-actions"><button class="btn btn-primary">Berikan reward</button></div>
  </form>`;
}

Actions['jenis-reward'] = el => {
  el.form.querySelector('#poin-bonus').hidden = el.value !== 'pujian';
};

Actions['form-reward'] = (el, user) => openModal('Beri reward', formRewardHtml(user, Number(el.dataset.uid)));

Forms.reward = (form, user, d) => jalankan(() => Logic.beriReward(user, d), 'Reward diberikan.');

Pages.reward = {
  title: 'Reward',
  render(user) {
    const ids = new Set(Logic.bawahanDari(user).map(b => b.id));
    const riwayat = Store.where('reward', r => r.pemberi_id === user.id || ids.has(r.penerima_id))
      .sort((a, b) => b.dibuat_pada - a.dibuat_pada);
    const label = { otomatis: 'Poin evaluasi', pujian: 'Pujian', sertifikat: 'Sertifikat' };
    return `<div class="grid-2">
      <section class="card"><div class="card-head"><h2>Beri reward</h2></div>${formRewardHtml(user)}</section>
      <section class="card"><div class="card-head"><h2>Peringkat divisi</h2><a href="#/peringkat">Selengkapnya</a></div>
        ${tabelPeringkat(user.divisi_id)}</section>
    </div>
    <section class="card"><div class="card-head"><h2>Riwayat reward</h2></div>
      ${riwayat.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Tanggal</th><th>Staf</th><th>Jenis</th><th>Pesan</th><th class="num">Poin</th></tr></thead>
        <tbody>${riwayat.map(r => `<tr><td>${fmtTanggal(r.dibuat_pada)}</td><td>${esc(namaUser(r.penerima_id))}</td>
          <td>${label[r.jenis]}</td><td>${esc(r.pesan)}</td><td class="num">${r.poin ? `+${r.poin}` : '–'}</td></tr>`).join('')}</tbody></table></div>`
        : kosong('Belum ada reward.')}
    </section>`;
  },
};

// ---------- Teguran ----------
function formTeguranHtml(user, uid, tingkat = 'Lisan', alasan = '') {
  return `<form data-form="teguran" class="stack">
    <label>Staf<select name="penerima_id" required><option value="">Pilih staf</option>${opsiBawahan(user, uid)}</select></label>
    <fieldset><legend>Tingkat teguran</legend>
      ${TINGKAT_TEGURAN.map(t => `<label class="radio"><input type="radio" name="tingkat" value="${t}"${t === tingkat ? ' checked' : ''}> ${t === 'Lisan' ? 'Teguran lisan (dicatat)' : t === 'SP1' ? 'Surat Peringatan 1' : 'Surat Peringatan 2'}</label>`).join('')}
    </fieldset>
    <label>Alasan<textarea name="alasan" rows="2" required>${esc(alasan)}</textarea></label>
    <label>Catatan pembinaan<textarea name="catatan_pembinaan" rows="3" required placeholder="Langkah perbaikan yang disepakati dan dukungan yang diberikan atasan"></textarea></label>
    <div class="form-actions"><button class="btn btn-warn">Berikan teguran</button></div>
  </form>`;
}

Actions['form-teguran'] = (el, user) => openModal('Beri teguran',
  formTeguranHtml(user, Number(el.dataset.uid), el.dataset.tingkat, el.dataset.alasan));

Forms.teguran = (form, user, d) => jalankan(() => Logic.beriTeguran(user, d), 'Teguran dicatat dan dikirim.');

Pages.teguran = {
  title: 'Teguran & Pembinaan',
  render(user) {
    const saran = Logic.saranTeguran(user);
    const ids = new Set(Logic.bawahanDari(user).map(b => b.id));
    const riwayat = Store.where('teguran', t => t.pemberi_id === user.id || ids.has(t.penerima_id))
      .sort((a, b) => b.dibuat_pada - a.dibuat_pada);
    return `<section class="card">
        <div class="card-head"><h2>Saran sistem</h2></div>
        <p class="muted small">Kriteria: terlambat ≥ 2× atau nilai &lt; 3 dalam 30 hari.</p>
        ${saran.length ? `<ul class="list">${saran.map(s => `<li class="list-row">${avatar(s.user)}
          <div class="grow"><strong>${esc(s.user.nama)}</strong><div class="muted small">${esc(s.alasan.join(' · '))}</div></div>
          <button class="btn btn-small btn-warn" data-action="form-teguran" data-uid="${s.user.id}" data-tingkat="${s.saranTingkat}" data-alasan="${esc(s.alasan.join('; '))}">Beri ${s.saranTingkat}</button></li>`).join('')}</ul>`
          : kosong('Tidak ada saran teguran saat ini.')}
      </section>
      <div class="grid-2">
        <section class="card"><div class="card-head"><h2>Beri teguran manual</h2></div>${formTeguranHtml(user)}</section>
        <section class="card"><div class="card-head"><h2>Riwayat teguran</h2></div>
          ${riwayat.length ? `<ul class="list">${riwayat.map(t => `<li class="list-row col">
            <div><span class="status s-teguran">${esc(t.tingkat)}</span> <strong>${esc(namaUser(t.penerima_id))}</strong>
              <span class="muted small">${fmtTanggal(t.dibuat_pada)} · ${t.dibaca_pada ? `dibaca ${fmtWaktu(t.dibaca_pada)}` : 'belum dibaca'}</span></div>
            <div class="small"><strong>Alasan:</strong> ${esc(t.alasan)}</div>
            <div class="small"><strong>Pembinaan:</strong> ${esc(t.catatan_pembinaan)}</div></li>`).join('')}</ul>`
            : kosong('Belum ada teguran.')}
        </section>
      </div>`;
  },
};
