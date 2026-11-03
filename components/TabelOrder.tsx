import Link from 'next/link';
import { Layanan, SlaBadge, Status } from './badges';
import { tanggalDb } from '@/lib/format';
import { hitungSla } from '@/lib/logic/order';
import type { OrderRingkas } from '@/lib/queries';
import type { StatusOrder } from '@prisma/client';

export function TabelOrder({ list, peta, kosong = 'Tidak ada order.' }: { list: OrderRingkas[]; peta: Partial<Record<StatusOrder, number>>; kosong?: string }) {
  if (!list.length) return <p className="empty">{kosong}</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Layanan</th><th>Order</th><th>Customer</th><th>Pelaksanaan</th><th>Tahap</th><th>SLA</th></tr></thead>
        <tbody>
          {list.map(o => (
            <tr key={o.id}>
              <td><Layanan j={o.jenis} /></td>
              <td><Link href={`/order/${o.id}`}><strong>{o.judul}</strong></Link><br /><span className="small muted">{o.nomorRfq} · {o.marketing.nama}</span></td>
              <td>{o.customer.nama}</td>
              <td className="small">{tanggalDb(o.tglMulai)} – {tanggalDb(o.tglSelesai)}</td>
              <td><Status s={o.status} />{o.unit && o.status === 'SILABUS_RAK' && <div className="small muted">{o.silabus?.diteruskanPada ? o.unit.nama : 'Menunggu DPS'}</div>}</td>
              <td><SlaBadge sla={hitungSla(o, peta)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
