'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

export type ItemNav = { href: string; label: string; count?: number; exact?: boolean; prefix?: string };

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
          {nav.map(i => (
            <Link key={i.href} href={i.href} className={`nav-item${aktif(i) ? ' active' : ''}`} aria-current={aktif(i) ? 'page' : undefined}>
              {i.label}
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
