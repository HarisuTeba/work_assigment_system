import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { rupiah, tanggalDb, tanggalPanjang } from '@/lib/format';
import { LAYANAN } from '@/lib/layanan';
import { orderCetak } from '../../akses';
import { Kop, Ttd } from '../../Kop';

export const metadata = { title: 'Quotation' };

export default async function CetakQuotation({ params }: { params: Promise<{ id: string }> }) {
  const q = await db.quotation.findUnique({ where: { id: Number((await params).id) || 0 } });
  if (!q) notFound();
  const o = await orderCetak(q.orderId);
  return (
    <article className="lembar">
      <Kop judul="Surat Penawaran Harga (Quotation)" nomor={q.nomor} />
      <p>Jakarta, {tanggalPanjang(q.dibuatPada)}</p>
      <p>Kepada Yth.<br /><strong>{o.customer.nama}</strong><br />Up. {o.customer.pic}{o.customer.alamat ? <><br />{o.customer.alamat}</> : null}</p>
      <p>Menindaklanjuti permintaan penawaran ({o.nomorRfq}), bersama ini kami sampaikan penawaran <strong>{LAYANAN[o.jenis].label}</strong> dengan rincian berikut:</p>
      <table className="dok-tabel">
        <tbody>
          <tr><th>Program</th><td>{o.judul}</td></tr>
          <tr><th>Jadwal</th><td>{tanggalDb(o.tglMulai)} – {tanggalDb(o.tglSelesai)}</td></tr>
          <tr><th>Lokasi</th><td>{o.lokasi}</td></tr>
          {o.jumlahPeserta != null && <tr><th>Peserta</th><td>{o.jumlahPeserta} orang</td></tr>}
          <tr><th>Nilai penawaran</th><td><strong>{rupiah(q.nilaiPenawaran)}</strong> (belum termasuk PPN)</td></tr>
          <tr><th>Berlaku sampai</th><td>{tanggalDb(q.berlakuSampai)}</td></tr>
          {q.catatan && <tr><th>Catatan</th><td>{q.catatan}</td></tr>}
        </tbody>
      </table>
      {o.silabus?.ringkasan && <><h2>Ruang lingkup materi</h2><p>{o.silabus.ringkasan}</p></>}
      <p>Persetujuan atas penawaran ini mohon disampaikan dalam bentuk Purchase Order (PO) atau persetujuan tertulis sebagai dasar penerbitan Surat Perintah Kerja.</p>
      <Ttd kiri={['Hormat kami,', o.marketing.nama, o.marketing.jabatan]} kanan={['Menyetujui,', o.customer.pic, o.customer.nama]} />
    </article>
  );
}
