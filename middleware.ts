import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, bacaToken } from '@/lib/session-token';

const AREA = ['admin', 'manager', 'spv', 'staff'] as const;

// Penjaga rute lapis pertama: harus login, dan area /<peran> hanya untuk peran itu.
// Pemeriksaan kepemilikan data tetap dilakukan di setiap aksi/halaman.
export async function middleware(req: NextRequest) {
  const t = await bacaToken(req.cookies.get(COOKIE)?.value);
  const { pathname } = req.nextUrl;
  if (pathname === '/login') {
    return t ? NextResponse.redirect(new URL(`/${t.peran}`, req.url)) : NextResponse.next();
  }
  if (!t) return NextResponse.redirect(new URL('/login', req.url));
  const area = pathname.split('/')[1];
  if ((AREA as readonly string[]).includes(area) && area !== t.peran) {
    return NextResponse.redirect(new URL(`/${t.peran}`, req.url));
  }
  if (pathname === '/') return NextResponse.redirect(new URL(`/${t.peran}`, req.url));
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/|favicon|.*\.(?:svg|png|ico|woff2?)$).*)'] };
