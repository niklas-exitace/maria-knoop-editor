import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Configure webpack to handle pdf.js worker
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
