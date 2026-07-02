/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // chess-tcn and @google/genai ship as ESM-only; transpile them so both webpack and next/jest can consume them
  transpilePackages: ['chess-tcn', '@google/genai'],
  webpack: (config, { isServer }) => {
    // Exclude fs, path, and os modules in client-side code
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
