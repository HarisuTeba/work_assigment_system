// Penyimpanan data di localStorage. Semua tabel disimpan dalam satu objek JSON.
const DB_KEY = 'wa_db_v1';
const SESSION_KEY = 'wa_session_v1';
const TABLES = [
  'divisi', 'users', 'perintah', 'langkah', 'penugasan', 'progres',
  'pertanyaan', 'laporan', 'evaluasi', 'reward', 'teguran', 'notifikasi',
];

const Store = {
  data: null,
  saveFailed: false,

  emptyDb() {
    const db = { seq: {} };
    TABLES.forEach(t => { db[t] = []; db.seq[t] = 0; });
    return db;
  },

  load() {
    let raw = null;
    try { raw = localStorage.getItem(DB_KEY); } catch (e) { /* storage diblokir */ }
    if (raw) {
      try { this.data = JSON.parse(raw); } catch (e) { this.data = null; }
    }
    if (!this.data || !this.data.seq) this.reset();
  },

  save() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this.data));
      this.saveFailed = false;
    } catch (e) {
      // Tetap jalan di memori; App menampilkan peringatan.
      this.saveFailed = true;
    }
  },

  reset() {
    this.data = this.emptyDb();
    Seed.run();
    this.save();
  },

  all(t) { return this.data[t]; },
  get(t, id) { return this.data[t].find(r => r.id === id) || null; },
  where(t, fn) { return this.data[t].filter(fn); },
  first(t, fn) { return this.data[t].find(fn) || null; },

  insert(t, row) {
    const rec = { id: ++this.data.seq[t], ...row };
    this.data[t].push(rec);
    return rec;
  },

  update(t, id, patch) {
    const r = this.get(t, id);
    if (r) Object.assign(r, patch);
    return r;
  },

  remove(t, id) {
    this.data[t] = this.data[t].filter(r => r.id !== id);
  },
};

const Session = {
  _mem: null,
  get() {
    try {
      const v = localStorage.getItem(SESSION_KEY);
      return v ? Number(v) : null;
    } catch (e) { return this._mem; }
  },
  set(id) {
    this._mem = id;
    try { localStorage.setItem(SESSION_KEY, String(id)); } catch (e) { /* abaikan */ }
  },
  clear() {
    this._mem = null;
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* abaikan */ }
  },
};
