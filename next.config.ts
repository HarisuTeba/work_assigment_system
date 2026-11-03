import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Lampiran PO/laporan maksimal 2 MB; sisakan ruang untuk isian form lain.
  experimental: { serverActions: { bodySizeLimit: '3mb' } },
};

export default nextConfig;
