import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { penggunaSaatIni } from '@/lib/session';

// Buka notifikasi: tandai dibaca lalu arahkan ke tautannya.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await penggunaSaatIni();
  if (!u) return NextResponse.redirect(new URL('/login', req.url));
  const n = await db.notifikasi.findUnique({ where: { id: Number((await params).id) || 0 } });
  if (!n || n.userId !== u.id) return NextResponse.redirect(new URL('/notifikasi', req.url));
  await db.notifikasi.update({ where: { id: n.id }, data: { dibaca: true } });
  const tujuan = n.tautan.startsWith('/') ? n.tautan : '/notifikasi';
  return NextResponse.redirect(new URL(tujuan, req.url));
}
