import { NextResponse, type NextRequest } from 'next/server';
import { AREA, beranda } from '@/lib/peran';
import { COOKIE, bacaToken } from '@/lib/session-token';

// Penjaga rute lapis pertama: harus login, dan area tertentu hanya untuk peran tertentu.
// Hak atas data (mis. order milik unit UPT) tetap diperiksa di setiap halaman/aksi.
export async function middleware(req: NextRequest) {
  const t = await bacaToken(req.cookies.get(COOKIE)?.value);
  const { pathname } = req.nextUrl;
  if (pathname === '/keluar') return NextResponse.next();
  if (pathname === '/login') {
    return t ? NextResponse.redirect(new URL(beranda(t.peran), req.url)) : NextResponse.next();
  }
  if (!t) return NextResponse.redirect(new URL('/login', req.url));
  const izin = AREA[pathname.split('/')[1]];
  if (pathname === '/' || (izin && !izin.includes(t.peran))) {
    return NextResponse.redirect(new URL(beranda(t.peran), req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/|favicon|.*\\.(?:svg|png|ico|woff2?)$).*)'] };
