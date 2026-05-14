/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      // Don't bundle Node-only modules on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        dns: false,
        fs: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
