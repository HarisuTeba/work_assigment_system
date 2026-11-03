import type { Metadata } from 'next';
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import './app.css';
import './theme.css';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--f-body', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500'], variable: '--f-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Sistem SPK Direktorat 3', template: '%s · Sistem SPK' },
  description: 'Monitoring order SPK Eksternal Direktorat 3: RFQ, Silabus & RAK, Quotation, SPK dengan approval berjenjang, operasional DPS, dan BAST.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
