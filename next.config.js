/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone para Docker (build pequeño, sin necesidad de node_modules en runtime)
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
};

module.exports = nextConfig;
