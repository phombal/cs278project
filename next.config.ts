import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack ignores stray parent-folder lockfiles.
  turbopack: { root: path.resolve(".") },
  // Typed routes can be re-enabled once /saved, /search, and /u/* routes are stable.
  // experimental: { typedRoutes: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
