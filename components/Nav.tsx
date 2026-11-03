'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

const IKON = {
  dasbor: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  tambah: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
  approval: <><path d="M9 12l2 2 4-4" /><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></>,
  kalender: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  dokumen: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
  pengajar: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
  pengguna: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .7 3.5 2.8 3.5 6" /></>,
  master: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
} as const;

export type NamaIkon = keyof typeof IKON;
export type ItemNav = { href: string; label: string; count?: number; exact?: boolean; prefix?: string; ikon?: NamaIkon };

export function Ikon({ nama }: { nama: NamaIkon }) {
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden>{IKON[nama]}</svg>;
}

/** Sidebar navigasi; di layar sempit menjadi laci yang dibuka tombol menu. */
export function Shell({ nav, wordmark, foot, top, children }: { nav: ItemNav[]; wordmark: ReactNode; foot: ReactNode; top: ReactNode; children: ReactNode }) {
  const path = usePathname();
  const [buka, setBuka] = useState(false);
  useEffect(() => setBuka(false), [path]);
  const aktif = (i: ItemNav) =>
    (i.prefix && path.startsWith(i.prefix)) || (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + '/'));
  return (
    <div className={`shell${buka ? ' nav-open' : ''}`}>
      <aside className="sidebar" id="sidebar">
        {wordmark}
        <nav aria-label="Menu utama">
          <div className="nav-label">Menu</div>
          {nav.map(i => (
            <Link key={i.href} href={i.href} className={`nav-item${aktif(i) ? ' active' : ''}`} aria-current={aktif(i) ? 'page' : undefined}>
              {i.ikon && <Ikon nama={i.ikon} />}
              <span className="grow">{i.label}</span>
              {!!i.count && <span className="nav-count">{i.count}</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">{foot}</div>
      </aside>
      <div className="nav-scrim" onClick={() => setBuka(false)} />
      <div className="main">
        <header className="topbar">
          <button type="button" className="menu-btn" aria-label="Buka menu" aria-controls="sidebar" aria-expanded={buka} onClick={() => setBuka(b => !b)}>
            <svg className="icon" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          {top}
        </header>
        {children}
      </div>
    </div>
  );
}
