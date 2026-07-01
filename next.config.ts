import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  webpack: (config, { dev }) => {
    // OneDrive/synced folders can corrupt webpack's persistent disk cache symlinks.
    if (dev) {
      config.cache = false;
      // Polling avoids stale/missing chunk reads when files sync through OneDrive.
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
