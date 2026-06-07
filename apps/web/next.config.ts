import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    moduleIds: 'named',
  },
  webpack: (config) => {
    config.module?.rules?.push({
      test: /\.ttf$/,
      type: 'asset/resource',
    });
    return config;
  },
};

export default nextConfig;
