/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  async rewrites() {
    const backend = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
}

module.exports = nextConfig
