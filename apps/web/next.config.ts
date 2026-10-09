import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  // A refresh or Server Action that hits a network error waits for the
  // connection instead of reloading the page. Verified in NUZ-24.
  experimental: { useOffline: true },
  async headers() {
    return [
      {
        // A sprite's path stays the same across deploys, so a tab still on
        // an old build never asks for a sprite that is gone. Its bytes change
        // only with a new pinned commit or override, and a week of a stale
        // sprite is acceptable.
        source: "/sprites/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
    ]
  },
}

export default nextConfig
