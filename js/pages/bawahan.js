// Halaman Bawahan: kotak masuk, konfirmasi, pengerjaan, laporan, nilai, teguran.

function itemTugas(p) {
  const pr = Store.get('perintah', p.perintah_id);
  const persen = Logic.persen(p);
  return `<li class="list-row">
    <a class="grow" href="#/tugas/${p.id}"><strong>${esc(pr.judul)}</strong>
      <div class="muted small">Tenggat ${fmtWaktu(pr.tenggat)}</div>
      <div class="progress-line small">${progressBar(persen)}<span>${persen}%</span></div></a>
    <div class="row-badges">${badgePrioritas(pr.prioritas)}${badgeStatus(p.status)}${badgeTerlambat(p)}</div></li>`;
}

// ---------- Dashboard ----------
Pages.dashBawahan = {
  render(user) {
    const pen = Logic.penugasanBawahan(user);
    const aktif = pen.filter(p => p.status !== STATUS.DISETUJUI)
      .sort((a, b) => Store.get('perintah', a.perintah_id).tenggat - Store.get('perintah', b.perintah_id).tenggat);
    const perluTindakan = aktif.filter(p => [STATUS.BARU, STATUS.REVISI].includes(p.status));
    const teguranBaru = Store.where('teguran', t => t.penerima_id === user.id && !t.dibaca_pada);
    const nilai = Logic.rataNilai(user.id);

    return `${teguranBaru.length ? `<a class="banner warn" href="#/teguran-saya"><strong>Teguran</strong>Anda memiliki ${teguranBaru.length} teguran yang belum dibaca.</a>` : ''}
      ${perluTindakan.length ? `<a class="banner info" href="#/tugas"><strong>Perlu tindakan</strong>${perluTindakan.length} penugasan menunggu konfirmasi atau revisi dari Anda.</a>` : ''}
      <div class="stats">
        ${statCard('Tugas aktif', aktif.length, '', '#/tugas')}
        ${statCard('Total poin', Logic.totalPoin(user.id), '', '#/peringkat')}
        ${statCard('Nilai rata-rata', fmtSkor(nilai), '', '#/nilai')}
        ${statCard('Tugas disetujui', pen.filter(p => p.status === STATUS.DISETUJUI).length, '', '#/nilai')}
      </div>
      <section class="card">
        <div class="card-head"><h2>Tugas aktif, tenggat terdekat dulu</h2><a href="#/tugas">Semua tugas</a></div>
        ${aktif.length ? `<ul class="list">${aktif.slice(0, 6).map(itemTugas).join('')}</ul>` : kosong('Tidak ada tugas aktif.')}
      </section>`;
  },
};

// ---------- Kotak masuk ----------
Pages.kotakMasuk = {
  title: 'Kotak Masuk Perintah',
  render(user) {
    const pen = Logic.penugasanBawahan(user).sort((a, b) => b.dibuat_pada - a.dibuat_pada);
    const aktif = pen.filter(p => p.status !== STATUS.DISETUJUI);
    const selesai = pen.filter(p => p.status === STATUS.DISETUJUI);
    return `<section class="card"><div class="card-head"><h2>Aktif (${aktif.length})</h2></div>
        ${aktif.length ? `<ul class="list">${aktif.map(itemTugas).join('')}</ul>` : kosong('Tidak ada tugas aktif.')}</section>
      <section class="card"><div class="card-head"><h2>Selesai (${selesai.length})</h2></div>
        ${selesai.length ? `<ul class="list">${selesai.map(itemTugas).join('')}</ul>` : kosong('Belum ada tugas yang disetujui.')}</section>`;
  },
};

// ---------- Kerjakan penugasan ----------
Pages.kerjakan = {
  surat: true,
  render(user, [id]) {
    const p = Logic.penugasanMilikBawahan(user, Number(id));
    const pr = Store.get('perintah', p.perintah_id);
    this.title = pr.judul;
    const persen = Logic.persen(p);
    const bisaKerja = STATUS_KERJA.includes(p.status);
    const semuaSelesai = Logic.progresPenugasan(p).every(r => r.progres.selesai);
    const evalTerakhir = Logic.evaluasi(p.id).pop();

    let tahap = '';
    if (p.status === STATUS.BARU) {
      tahap = `<section class="card highlight">
        <div class="card-head"><h2>Sudah paham perintah ini?</h2></div>
        <p>Ada yang belum jelas? Ajukan pertanyaan di bawah.</p>
        <div class="form-actions start"><button class="btn btn-primary" data-action="konfirmasi" data-pid="${p.id}">Saya paham, mulai kerjakan</button></div>
      </section>`;
    } else if (p.status === STATUS.MENUNGGU) {
      tahap = `<div class="banner info"><strong>Menunggu jawaban</strong>Konfirmasi bisa dilakukan setelah atasan menjawab semua pertanyaan Anda.</div>`;
    } else if (p.status === STATUS.REVISI && evalTerakhir) {
      tahap = `<div class="banner warn"><strong>Perlu revisi</strong>“${esc(evalTerakhir.umpan_balik)}” Perbaiki, lalu kirim ulang laporan akhir.</div>`;
    } else if (p.status === STATUS.DILAPORKAN) {
      tahap = `<div class="banner info"><strong>Dilaporkan</strong>Laporan sudah dikirim dan menunggu evaluasi atasan.</div>`;
    } else if (p.status === STATUS.DISETUJUI) {
      const poin = Store.first('reward', r => r.penugasan_id === p.id && r.jenis === 'otomatis');
      tahap = `<div class="banner ok"><strong>Disetujui</strong>${poin ? `Anda mendapat ${poin.poin} poin dari evaluasi ini.` : 'Penugasan selesai.'}</div>`;
    }

    return `<a href="#/tugas" class="back">← Kotak masuk</a>
      ${kartuInstruksi(pr, p)}
      <section class="card">
        <div class="card-head"><h2>Status penugasan Anda</h2><div class="row-badges">${badgeStatus(p.status)}${badgeTerlambat(p)}</div></div>
        <div class="progress-line">${progressBar(persen)}<span>${persen}% langkah selesai</span></div>
        ${garisWaktu(p, pr)}
      </section>
      ${tahap}
      <div class="grid-2">
        <section class="card">
          <div class="card-head"><h2>Langkah pengerjaan</h2></div>
          ${!bisaKerja && [STATUS.BARU, STATUS.MENUNGGU].includes(p.status) ? '<p class="muted small">Langkah terbuka setelah Anda menyatakan paham.</p>' : ''}
          ${daftarLangkah(p, bisaKerja)}
        </section>
        <div class="stack-lg">
          ${threadTanya(p, user)}
          ${!STATUS_SELESAI.includes(p.status) ? `<section class="card">
            <form data-form="tanya" data-pid="${p.id}" class="stack">
              <label>Ajukan pertanyaan klarifikasi<textarea name="isi" rows="2" required placeholder="Apa yang belum jelas dari perintah ini?"></textarea></label>
              <div class="form-actions"><button class="btn btn-ghost">Kirim pertanyaan</button></div>
            </form></section>` : ''}
        </div>
      </div>
      ${bisaKerja && semuaSelesai ? `<section class="card highlight">
        <div class="card-head"><h2>Laporan akhir</h2></div>
        <form data-form="laporan" data-pid="${p.id}" class="stack">
          <label>Ringkasan hasil<textarea name="hasil" rows="3" required placeholder="Apa yang sudah dihasilkan dan di mana hasilnya bisa dilihat"></textarea></label>
          <label>Kendala (opsional)<textarea name="kendala" rows="2"></textarea></label>
          <label>Lampiran (opsional, maks. 200 KB)<input type="file" name="lampiran"></label>
          <div class="form-actions"><button class="btn btn-primary">Kirim laporan akhir</button></div>
        </form></section>` : ''}
      ${riwayatLaporan(p)}
      ${riwayatEvaluasi(p)}`;
  },
};

Actions.konfirmasi = (el, user) =>
  jalankan(() => Logic.konfirmasi(user, Number(el.dataset.pid)));

Forms.tanya = (form, user, d) =>
  jalankan(() => Logic.tanya(user, Number(form.dataset.pid), d.isi));

Forms['selesai-langkah'] = (form, user, d) =>
  jalankan(() => Logic.selesaikanLangkah(user, Number(form.dataset.pid), Number(form.dataset.lid), d.catatan));

Forms.laporan = (form, user, d) => {
  const file = form.querySelector('[name=lampiran]').files[0];
  const kirim = lampiran => jalankan(() => Logic.kirimLaporan(user, Number(form.dataset.pid), { ...d, lampiran }), 'Laporan akhir terkirim.');
  if (!file) return kirim(null);
  if (file.size > BATAS_LAMPIRAN) return toast('Lampiran maksimal 200 KB.', 'error');
  const reader = new FileReader();
  reader.onload = () => kirim({ nama: file.name, ukuran: file.size, data: reader.result });
  reader.onerror = () => toast('Gagal membaca file lampiran.', 'error');
  reader.readAsDataURL(file);
};

// ---------- Nilai & reward ----------
Pages.nilai = {
  title: 'Nilai & Reward',
  render(user) {
    const pen = Logic.penugasanBawahan(user);
    const evals = Store.where('evaluasi', e => pen.some(p => p.id === e.penugasan_id)).sort((a, b) => b.dibuat_pada - a.dibuat_pada);
    const rewards = Store.where('reward', r => r.penerima_id === user.id).sort((a, b) => b.dibuat_pada - a.dibuat_pada);
    const label = { otomatis: 'Poin evaluasi', pujian: 'Pujian', sertifikat: 'Sertifikat Karyawan Teladan' };
    return `<div class="stats">
        ${statCard('Total poin', Logic.totalPoin(user.id))}
        ${statCard('Nilai rata-rata', fmtSkor(Logic.rataNilai(user.id)))}
        ${statCard('Sertifikat', rewards.filter(r => r.jenis === 'sertifikat').length)}
      </div>
      <section class="card"><div class="card-head"><h2>Riwayat evaluasi</h2></div>
        ${evals.length ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Tanggal</th><th>Perintah</th><th class="num">Waktu</th><th class="num">Kualitas</th><th class="num">Kesesuaian</th><th>Keputusan</th><th>Umpan balik</th></tr></thead>
          <tbody>${evals.map(e => {
            const p = Store.get('penugasan', e.penugasan_id);
            const pr = Store.get('perintah', p.perintah_id);
            return `<tr class="clickable" data-action="buka" data-href="#/tugas/${p.id}"><td>${fmtTanggal(e.dibuat_pada)}</td><td>${esc(pr.judul)}</td>
              <td class="num">${e.skor_waktu}</td><td class="num">${e.skor_kualitas}</td><td class="num">${e.skor_kesesuaian}</td>
              <td>${e.keputusan === 'setujui' ? badgeStatus(STATUS.DISETUJUI) : badgeStatus(STATUS.REVISI)}</td><td class="small">${esc(e.umpan_balik)}</td></tr>`;
          }).join('')}</tbody></table></div>` : kosong('Belum ada evaluasi.')}
      </section>
      <section class="card"><div class="card-head"><h2>Riwayat reward</h2></div>
        ${rewards.length ? `<ul class="list">${rewards.map(r => `<li class="list-row">
          <div class="grow"><strong>${label[r.jenis]}</strong> <span class="muted small">dari ${esc(namaUser(r.pemberi_id))} · ${fmtTanggal(r.dibuat_pada)}</span>
            <div class="small">${esc(r.pesan)}</div></div>
          <div class="points">${r.poin ? `+${r.poin}` : ''}</div></li>`).join('')}</ul>` : kosong('Belum ada reward.')}
      </section>`;
  },
};

// ---------- Teguran saya ----------
Pages.teguranSaya = {
  title: 'Teguran Saya',
  render(user) {
    const list = Store.where('teguran', t => t.penerima_id === user.id).sort((a, b) => b.dibuat_pada - a.dibuat_pada);
    return `<section class="card">
      <div class="card-head"><h2>Catatan teguran & pembinaan</h2></div>
      ${list.length ? `<ul class="list">${list.map(t => `<li class="list-row col${t.dibaca_pada ? '' : ' unread'}">
        <div><span class="status s-teguran">${esc(t.tingkat)}</span> dari <strong>${esc(namaUser(t.pemberi_id))}</strong>
          <span class="muted small">${fmtWaktu(t.dibuat_pada)}</span></div>
        <div><strong>Alasan:</strong> ${esc(t.alasan)}</div>
        <div><strong>Catatan pembinaan:</strong> ${esc(t.catatan_pembinaan)}</div>
        ${t.dibaca_pada ? `<div class="muted small">Dibaca ${fmtWaktu(t.dibaca_pada)}</div>`
          : `<div><button class="btn btn-primary btn-small" data-action="baca-teguran" data-id="${t.id}">Saya sudah membaca</button></div>`}
      </li>`).join('')}</ul>` : kosong('Tidak ada teguran. Pertahankan kinerja Anda.')}
    </section>`;
  },
};

Actions['baca-teguran'] = (el, user) =>
  jalankan(() => Logic.tandaiTeguranDibaca(user, Number(el.dataset.id)), 'Teguran ditandai sudah dibaca.');
