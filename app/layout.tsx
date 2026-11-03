import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from 'next/font/google';
import './globals.css';
import './app.css';

const display = Newsreader({ subsets: ['latin'], weight: ['600'], variable: '--f-display', display: 'swap' });
const body = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '600'], variable: '--f-body', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500'], variable: '--f-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Sistem Perintah Kerja', template: '%s · Sistem Perintah Kerja' },
  description: 'Penerbitan ISPK/SPK, pengesahan Manager, pelaporan AP harian, PICA mingguan, dan evaluasi kerja staff.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
