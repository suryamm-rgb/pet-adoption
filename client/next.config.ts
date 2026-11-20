import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // small self-contained build for Docker
  distDir: process.env.NEXT_DIST_DIR ?? ".next", // end-to-end tests use their own build folder so they never clash with `next dev`
  poweredByHeader: false,
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
