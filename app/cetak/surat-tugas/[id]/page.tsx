import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { tanggalDb, tanggalPanjang } from '@/lib/format';
import { LAYANAN } from '@/lib/layanan';
import { orderCetak } from '../../akses';
import { Kop, Ttd } from '../../Kop';

export const metadata = { title: 'Surat Tugas' };

export default async function CetakSuratTugas({ params }: { params: Promise<{ id: string }> }) {
  const t = await db.penugasanPengajar.findUnique({ where: { id: Number((await params).id) || 0 }, include: { pengajar: { include: { unit: true } } } });
  if (!t || !t.nomorSuratTugas) notFound();
  const o = await orderCetak(t.orderId);
  const kadep = await db.user.findFirst({ where: { peran: 'kadep_dps', aktif: true } });
  return (
    <article className="lembar">
      <Kop judul="Surat Tugas" nomor={t.nomorSuratTugas} />
      <p>Kepala Departemen Pelatihan & Sertifikasi menugaskan:</p>
      <table className="dok-tabel">
        <tbody>
          <tr><th>Nama</th><td><strong>{t.pengajar.nama}</strong></td></tr>
          <tr><th>Jabatan</th><td>{t.pengajar.jabatan}{t.pengajar.eksternal ? ' (pengajar eksternal)' : t.pengajar.unit ? ` · ${t.pengajar.unit.nama}` : ''}</td></tr>
          <tr><th>Sebagai</th><td>{t.peran}</td></tr>
        </tbody>
      </table>
      <p>untuk melaksanakan kegiatan berikut berdasarkan SPK nomor <strong>{o.spk?.nomor}</strong>:</p>
      <table className="dok-tabel">
        <tbody>
          <tr><th>Kegiatan</th><td>{o.judul} ({LAYANAN[o.jenis].label})</td></tr>
          <tr><th>Customer</th><td>{o.customer.nama}</td></tr>
          <tr><th>Tanggal</th><td>{tanggalDb(o.tglMulai)} – {tanggalDb(o.tglSelesai)}</td></tr>
          <tr><th>Tempat</th><td>{o.lokasi}{o.booking.length ? ` · ${o.booking.map(b => b.fasilitas.nama).join(', ')}` : ''}</td></tr>
        </tbody>
      </table>
      <p>Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.</p>
      <Ttd kiri={['', '', '']} kanan={[`Jakarta, ${tanggalPanjang(t.suratTugasPada ?? new Date())}`, kadep?.nama ?? '................', 'Kepala Departemen DPS']} />
    </article>
  );
}
