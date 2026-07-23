/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: (process.env.INTERNAL_API_URL || 'http://api:8000') + '/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: (process.env.INTERNAL_API_URL || 'http://api:8000') + '/uploads/:path*',
      },
    ]
  },
}

module.exports = nextConfig
