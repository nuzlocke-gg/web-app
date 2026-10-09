import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  // A refresh or Server Action that hits a network error waits for the
  // connection instead of reloading the page. Verified in NUZ-24.
  experimental: { useOffline: true },
  async headers() {
    return [
      {
        // The game-data build names the sprite directory by a hash of its
        // contents, so a sprite URL never changes meaning.
        source: "/sprites/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]
  },
}

export default nextConfig
