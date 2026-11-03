import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from 'next/font/google';
import './globals.css';
import './app.css';

const display = Newsreader({ subsets: ['latin'], weight: ['600'], variable: '--f-display', display: 'swap' });
const body = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '600'], variable: '--f-body', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500'], variable: '--f-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Sistem SPK Direktorat 3', template: '%s · Sistem SPK' },
  description: 'Monitoring order SPK Eksternal Direktorat 3: RFQ, Silabus & RAK, Quotation, SPK dengan approval berjenjang, operasional DPS, dan BAST.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
