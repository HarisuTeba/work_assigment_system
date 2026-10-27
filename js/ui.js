// Helper tampilan: format, komponen kecil, modal, toast.

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const pad2 = n => String(n).padStart(2, '0');

function fmtTanggal(ms) {
  if (!ms) return '-';
  const d = new Date(ms);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtWaktu(ms) {
  if (!ms) return '-';
  const d = new Date(ms);
  return `${fmtTanggal(ms)}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function sisaWaktu(tenggat) {
  const diff = tenggat - now();
  const abs = Math.abs(diff);
  const hari = Math.floor(abs / HARI);
  const jam = Math.floor((abs % HARI) / 3600000);
  const teksDurasi = hari ? `${hari} hari${jam ? ` ${jam} jam` : ''}` : `${Math.max(jam, 1)} jam`;
  return diff >= 0 ? `sisa ${teksDurasi}` : `lewat ${teksDurasi}`;
}

// Nilai untuk <input type="datetime-local">.
function toLocalInput(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');

// Status selalu tampil sebagai label teks + penanda bentuk, bukan warna saja.
function badgeStatus(status) {
  return `<span class="status s-${slug(status)}">${esc(status)}</span>`;
}

function badgeTerlambat(p) {
  return p.terlambat ? '<span class="status s-terlambat" title="Melewati tenggat">Terlambat</span>' : '';
}

function badgePrioritas(pr) {
  return `<span class="prio p-${slug(pr)}" title="Prioritas ${esc(pr)}">${esc(pr)}</span>`;
}

// Cap stempel untuk lembar surat (Disetujui / Perlu Revisi / Terlambat).
function stempel(p) {
  if (p.status === STATUS.DISETUJUI) return '<span class="stamp good">Disetujui</span>';
  if (p.status === STATUS.REVISI) return '<span class="stamp">Perlu revisi</span>';
  if (p.terlambat) return '<span class="stamp">Terlambat</span>';
  return '';
}

function fmtSkor(n) { return n == null ? '–' : n.toFixed(2); }

function bintang(n) {
  return `<span class="score-num" aria-label="${n} dari 5">${n}<span>/5</span></span>`;
}

function nomorSurat(pr) {
  return `SP/${String(pr.id).padStart(3, '0')}/${new Date(pr.dibuat_pada).getFullYear()}`;
}

const HARI_NAMA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function tanggalPanjang(ms) {
  const d = new Date(ms);
  return `${HARI_NAMA[d.getDay()]}, ${d.getDate()} ${BULAN_PANJANG[d.getMonth()]} ${d.getFullYear()}`;
}

// Ikon garis buatan sendiri (satu gaya goresan untuk seluruh aplikasi).
const IKON = {
  menu: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  bel: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
};

function progressBar(persen) {
  return `<div class="progress" role="progressbar" aria-valuenow="${persen}" aria-valuemin="0" aria-valuemax="100">
    <div class="progress-fill" style="width:${persen}%"></div></div>`;
}

function kosong(pesan) {
  return `<div class="empty">${esc(pesan)}</div>`;
}

function statCard(label, nilai, sub = '', tautan = '') {
  const isi = `<div class="stat-label">${esc(label)}</div><div class="stat-value">${esc(nilai)}</div>${sub ? `<div class="stat-sub">${esc(sub)}</div>` : ''}`;
  return tautan ? `<a class="card stat" href="${tautan}">${isi}</a>` : `<div class="card stat">${isi}</div>`;
}

function opsi(list, terpilih) {
  return list.map(v => `<option value="${esc(v)}"${v === terpilih ? ' selected' : ''}>${esc(v)}</option>`).join('');
}

function avatar(user) {
  const inisial = user.nama.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return `<span class="avatar" aria-hidden="true">${esc(inisial)}</span>`;
}

// Diagram batang horizontal sederhana (satu seri, satu warna).
function barChart(rows, { max, format = v => v, kosongPesan = 'Belum ada data.' } = {}) {
  if (!rows.length) return kosong(kosongPesan);
  const m = max || Math.max(1, ...rows.map(r => r.value || 0));
  return `<div class="bars">${rows.map(r => {
    const w = r.value == null ? 0 : Math.max(2, r.value / m * 100);
    return `<div class="bar-row" title="${esc(r.label)}: ${esc(r.value == null ? 'belum ada' : format(r.value))}">
      <div class="bar-label">${esc(r.label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${w}%"></div></div>
      <div class="bar-value">${esc(r.value == null ? '–' : format(r.value))}</div>
    </div>`;
  }).join('')}</div>`;
}

// Diagram kolom vertikal untuk deret waktu.
function columnChart(rows) {
  const m = Math.max(1, ...rows.map(r => r.value));
  return `<div class="cols" role="img" aria-label="${esc(rows.map(r => `${r.label}: ${r.value}`).join(', '))}">${rows.map(r => `
    <div class="col" title="${esc(r.label)}: ${r.value} tugas">
      <div class="col-value">${r.value}</div>
      <div class="col-track"><div class="col-fill" style="height:${r.value ? Math.max(4, r.value / m * 100) : 0}%"></div></div>
      <div class="col-label">${esc(r.label)}</div>
    </div>`).join('')}</div>`;
}

// ---------- Toast & modal ----------
function toast(pesan, tipe = 'ok') {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast toast-${tipe}`;
  el.setAttribute('role', tipe === 'error' ? 'alert' : 'status');
  el.textContent = pesan;
  root.appendChild(el);
  setTimeout(() => el.classList.add('hide'), 3200);
  setTimeout(() => el.remove(), 3600);
}

function openModal(judul, isiHtml) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-backdrop" data-action="tutup-modal">
    <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(judul)}">
      <div class="modal-head"><h2>${esc(judul)}</h2>
        <button class="btn-text" data-action="tutup-modal">Tutup</button></div>
      <div class="modal-body">${isiHtml}</div>
    </div></div>`;
  const first = root.querySelector('input, select, textarea');
  if (first) first.focus();
}

function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

// Jalankan aksi, tampilkan pesan, lalu render ulang halaman.
// pesanSukses hanya diisi bila hasilnya tidak langsung terlihat di layar.
function jalankan(fn, pesanSukses) {
  try {
    fn();
    closeModal();
    if (pesanSukses) toast(pesanSukses);
    App.render();
    return true;
  } catch (e) {
    if (e instanceof ValidasiError) toast(e.message, 'error');
    else { console.error(e); toast('Terjadi kesalahan tak terduga.', 'error'); }
    return false;
  }
}

function formData(form) {
  const fd = new FormData(form);
  const obj = {};
  for (const [k, v] of fd.entries()) {
    if (k.endsWith('[]')) (obj[k.slice(0, -2)] ||= []).push(v);
    else obj[k] = v;
  }
  return obj;
}
