import { notFound } from 'next/navigation';
import { JenisLayanan } from '@prisma/client';
import { db } from '@/lib/db';
import { rupiah, tanggalDb, waktu } from '@/lib/format';
import { LAYANAN } from '@/lib/layanan';
import { totalRak } from '@/lib/logic/silabus';
import { orderCetak } from '../../akses';
import { Kop } from '../../Kop';

export const metadata = { title: 'Surat Perintah Kerja' };

/** Ketentuan khusus tiap template SPK (multi-template sesuai jenis layanan). */
const KETENTUAN: Record<JenisLayanan, string[]> = {
  TRAINING: ['DPS menyiapkan instruktur, modul, dan sertifikat peserta.', 'Daftar hadir dan evaluasi peserta menjadi lampiran laporan kegiatan.'],
  SERTIFIKASI: ['Uji kompetensi dilaksanakan sesuai skema dan ketentuan lembaga sertifikasi.', 'Hasil uji dilaporkan per peserta (kompeten / belum kompeten).'],
  KOMBINASI: ['Pelatihan diselesaikan sebelum uji sertifikasi dimulai.', 'Biaya pelatihan dan uji sertifikasi dikelola dalam satu paket anggaran.'],
  KONSULTASI: ['Output diserahkan sesuai milestone yang disepakati.', 'Monitoring dilakukan sesuai jadwal; perubahan lingkup dicatat secara tertulis.'],
  SEWA_RUANG: ['Ruangan/fasilitas dikembalikan dalam kondisi semula.', 'Kerusakan selama masa sewa menjadi tanggung jawab penyewa.'],
};

export default async function CetakSpk({ params }: { params: Promise<{ id: string }> }) {
  const spk = await db.spk.findUnique({ where: { id: Number((await params).id) || 0 }, include: { approver1: true, approver2: true } });
  if (!spk) notFound();
  const o = await orderCetak(spk.orderId);
  const detail = o.detail as Record<string, string>;
  const pengajar = o.pengajar.filter(p => p.status === 'BERSEDIA');
  return (
    <article className="lembar">
      <Kop judul={`Surat Perintah Kerja — ${LAYANAN[o.jenis].label}`} nomor={spk.nomor} draf={!spk.nomor} />
      <p>Berdasarkan {o.po?.jenis === 'PO' ? 'Purchase Order' : 'persetujuan quotation'} nomor <strong>{o.po?.nomor}</strong> tanggal {tanggalDb(o.po?.tanggal)}, Direktorat 3 Industrial Service memerintahkan pelaksanaan pekerjaan berikut:</p>
      <table className="dok-tabel">
        <tbody>
          <tr><th>Customer</th><td>{o.customer.nama}</td></tr>
          <tr><th>Pekerjaan</th><td>{o.judul}</td></tr>
          <tr><th>Ruang lingkup</th><td>{spk.ruangLingkup}</td></tr>
          <tr><th>Jadwal</th><td>{tanggalDb(o.tglMulai)} – {tanggalDb(o.tglSelesai)}</td></tr>
          <tr><th>Lokasi</th><td>{o.lokasi}</td></tr>
          {o.jumlahPeserta != null && <tr><th>{o.jenis === 'SEWA_RUANG' ? 'Pengguna' : 'Peserta'}</th><td>{o.jumlahPeserta} orang</td></tr>}
          {LAYANAN[o.jenis].atribut.filter(a => detail[a.key]).map(a => (
            <tr key={a.key}><th>{a.label.replace(/ \(.*\)$/, '')}</th><td>{a.tipe === 'number' ? rupiah(detail[a.key]) : detail[a.key]}</td></tr>
          ))}
          <tr><th>Unit pelaksana</th><td>Departemen Pelatihan & Sertifikasi{o.unit ? ` bersama ${o.unit.nama}` : ''}</td></tr>
          {pengajar.length > 0 && <tr><th>Pengajar</th><td>{pengajar.map(p => p.pengajar.nama).join(', ')}</td></tr>}
        </tbody>
      </table>
      <h2>Anggaran</h2>
      <table className="dok-tabel">
        <thead><tr><th>Uraian (RAK)</th><th className="num">Jumlah</th></tr></thead>
        <tbody>
          {o.rakItem.map(i => <tr key={i.id}><td>{i.uraian} ({i.volume} {i.satuan})</td><td className="num">{rupiah(i.volume * Number(i.hargaSatuan))}</td></tr>)}
          <tr><th>Total budget RAK</th><td className="num"><strong>{rupiah(totalRak(o.rakItem))}</strong></td></tr>
          <tr><th>Nilai kontrak</th><td className="num"><strong>{rupiah(spk.nilaiKontrak)}</strong></td></tr>
        </tbody>
      </table>
      <h2>Ketentuan</h2>
      <ol>{KETENTUAN[o.jenis].map(k => <li key={k}>{k}</li>)}<li>Setelah pekerjaan selesai, DPS menyerahkan laporan kegiatan sebagai dasar Berita Acara Serah Terima.</li></ol>
      {spk.catatan && <p><strong>Catatan:</strong> {spk.catatan}</p>}
      <div className="ttd ttd-3">
        <div><span>Dibuat oleh,</span><span className="ttd-ruang" /><strong>{o.marketing.nama}</strong><span>Marketing</span></div>
        <div><span>Disetujui (1),</span><span className="ttd-ruang">{spk.approval1Pada ? `✓ ${waktu(spk.approval1Pada)}` : ''}</span><strong>{spk.approver1?.nama ?? '................'}</strong><span>Kadep Marketing</span></div>
        <div><span>Disetujui (2),</span><span className="ttd-ruang">{spk.approval2Pada ? `✓ ${waktu(spk.approval2Pada)}` : ''}</span><strong>{spk.approver2?.nama ?? '................'}</strong><span>Kadep DPS</span></div>
      </div>
    </article>
  );
}
