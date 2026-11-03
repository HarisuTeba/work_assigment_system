import { wajibLogin } from '@/lib/session';
import './cetak.css';

// Halaman cetak dokumen resmi (A4). Disimpan sebagai PDF lewat dialog cetak browser.
export default async function CetakLayout({ children }: { children: React.ReactNode }) {
  await wajibLogin();
  return <div className="cetak-wrap">{children}</div>;
}
