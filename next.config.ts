import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // Allows a second local preview when a stale dev process still owns `.next`.
  distDir: process.env.CUBIK_NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
