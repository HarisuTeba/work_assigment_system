import { JenisPerintah, Prioritas } from '@prisma/client';
import { Form, Submit } from '@/components/Form';
import { LangkahInput } from '@/components/LangkahInput';
import { Lampiran } from '@/components/surat';
import { simpanPerintah } from '@/app/actions/perintah';
import { LABEL_PRIORITAS } from '@/lib/format';
import type { PerintahLengkap } from '@/lib/queries';
import { keInputLokal, ymd } from '@/lib/waktu';

/** Form ISPK/SPK. Isian PO hanya tampil (lewat CSS :has) saat jenis SPK dipilih. */
export function FormPerintah({ pr }: { pr?: PerintahLengkap }) {
  const jenis = pr?.jenis ?? JenisPerintah.ISPK;
  return (
    <Form action={simpanPerintah.bind(null, pr?.id ?? null)} className="stack-lg">
      <fieldset>
        <legend>Jenis perintah kerja</legend>
        <div className="choice">
          <label>
            <input type="radio" name="jenis" value="ISPK" defaultChecked={jenis === 'ISPK'} />
            <span><strong>ISPK</strong><span className="small muted">Proyek internal perusahaan</span></span>
          </label>
          <label>
            <input type="radio" name="jenis" value="SPK" defaultChecked={jenis === 'SPK'} />
            <span><strong>SPK</strong><span className="small muted">Proyek berdasarkan Purchase Order klien</span></span>
          </label>
        </div>
      </fieldset>

      <fieldset className="po-fields">
        <legend>Data Purchase Order</legend>
        <div className="grid-2 tight">
          <label>Nomor PO<input name="noPo" defaultValue={pr?.noPo ?? ''} maxLength={60} /></label>
          <label>Tanggal PO<input type="date" name="tglPo" defaultValue={pr?.tglPo ? pr.tglPo.toISOString().slice(0, 10) : ''} /></label>
          <label>Nama klien<input name="klien" defaultValue={pr?.klien ?? ''} maxLength={120} /></label>
          <label>Nilai PO (Rp)<input name="nilaiPo" inputMode="numeric" defaultValue={pr?.nilaiPo ? String(Number(pr.nilaiPo)) : ''} placeholder="mis. 45000000" /></label>
        </div>
        <label>Dokumen PO
          <input type="file" name="lampiranPo" accept=".pdf,.jpg,.jpeg,.png" />
          <span className="hint">PDF/JPG/PNG, maks. 2 MB{pr?.lampiranPo && <> · tersimpan: <Lampiran nama={pr.lampiranPo} /></>}</span>
        </label>
      </fieldset>

      <fieldset>
        <legend>Rincian pekerjaan</legend>
        <label>Judul pekerjaan<input name="judul" defaultValue={pr?.judul} required maxLength={120} /></label>
        <label>Lingkup pekerjaan<textarea name="apa" rows={3} defaultValue={pr?.apa} required /></label>
        <label>Tujuan<textarea name="mengapa" rows={2} defaultValue={pr?.mengapa} required /></label>
        <label>Lokasi<textarea name="diMana" rows={2} defaultValue={pr?.diMana} required /></label>
        <label>Standar hasil<textarea name="bagaimana" rows={2} defaultValue={pr?.bagaimana} required /></label>
        <div className="grid-2 tight">
          <label>Tenggat<input type="datetime-local" name="tenggat" defaultValue={pr ? keInputLokal(pr.tenggat) : ''} min={`${ymd()}T00:00`} required /></label>
          <label>Prioritas
            <select name="prioritas" defaultValue={pr?.prioritas ?? Prioritas.SEDANG}>
              {Object.entries(LABEL_PRIORITAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        <p className="hint">Staff penerima dipilih setelah perintah disahkan Manager.</p>
      </fieldset>

      <LangkahInput awal={pr?.langkah.map(l => l.deskripsi) ?? []} />

      <div className="form-actions start">
        <Submit name="aksi" value="ajukan">Simpan & ajukan ke Manager</Submit>
        <Submit name="aksi" value="draf" className="btn btn-ghost">Simpan sebagai draf</Submit>
      </div>
    </Form>
  );
}
