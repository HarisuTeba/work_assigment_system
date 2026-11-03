import 'server-only';
import { notFound } from 'next/navigation';
import { ValidasiError } from '@/lib/errors';
import { orderTerlihat } from '@/lib/logic/order';
import { ambilOrder } from '@/lib/queries';
import { wajibLogin } from '@/lib/session';

/** Order lengkap untuk dokumen cetak, hanya bila pengguna berhak melihatnya. */
export async function orderCetak(orderId: number) {
  const u = await wajibLogin();
  try {
    await orderTerlihat(u, orderId);
  } catch (e) {
    if (e instanceof ValidasiError) notFound();
    throw e;
  }
  return (await ambilOrder(orderId))!;
}
