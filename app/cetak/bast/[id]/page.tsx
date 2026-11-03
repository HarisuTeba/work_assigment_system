import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { rupiah, tanggalDb, tanggalPanjang } from '@/lib/format';
import { LAYANAN } from '@/lib/layanan';
import { orderCetak } from '../../akses';
import { Kop, Ttd } from '../../Kop';

export const metadata = { title: 'Berita Acara Serah Terima' };

export default async function CetakBast({ params }: { params: Promise<{ id: string }> }) {
  const b = await db.bast.findUnique({ where: { id: Number((await params).id) || 0 } });
  if (!b) notFound();
  const o = await orderCetak(b.orderId);
  return (
    <article className="lembar">
      <Kop judul="Berita Acara Serah Terima Pekerjaan" nomor={b.nomor} />
      <p>Pada hari ini, {tanggalPanjang(b.tanggal)}, telah dilakukan serah terima pekerjaan antara Politeknik Astra (Direktorat 3 Industrial Service) dan <strong>{o.customer.nama}</strong> sebagai berikut:</p>
      <table className="dok-tabel">
        <tbody>
          <tr><th>Pekerjaan</th><td>{o.judul} ({LAYANAN[o.jenis].label})</td></tr>
          <tr><th>Dasar</th><td>SPK {o.spk?.nomor} · PO {o.po?.nomor}</td></tr>
          <tr><th>Pelaksanaan</th><td>{tanggalDb(o.tglMulai)} – {tanggalDb(o.tglSelesai)} · {o.lokasi}</td></tr>
          {o.laporan?.jumlahHadir != null && <tr><th>Peserta hadir</th><td>{o.laporan.jumlahHadir} orang</td></tr>}
          <tr><th>Hasil</th><td>{o.laporan?.ringkasan}</td></tr>
          <tr><th>Nilai pekerjaan</th><td><strong>{rupiah(o.spk?.nilaiKontrak)}</strong></td></tr>
          {b.catatan && <tr><th>Catatan</th><td>{b.catatan}</td></tr>}
        </tbody>
      </table>
      <p>Laporan kegiatan terlampir. Dengan ditandatanganinya berita acara ini, pekerjaan dinyatakan selesai dan dapat diproses untuk penagihan.</p>
      <Ttd kiri={['Pihak Pertama,', o.marketing.nama, 'Politeknik Astra']} kanan={['Pihak Kedua,', o.customer.pic, o.customer.nama]} />
    </article>
  );
}
