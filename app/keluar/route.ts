import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE } from '@/lib/session-token';

// Sesi yang tokennya sah tetapi akunnya sudah tidak ada/nonaktif dibersihkan di sini,
// agar tidak terjadi putaran redirect antara middleware dan /login.
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/login', req.url));
  res.cookies.delete(COOKIE);
  return res;
}
