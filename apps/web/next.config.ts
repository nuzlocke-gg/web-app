import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  // A refresh or Server Action that hits a network error waits for the
  // connection instead of reloading the page. Verified in NUZ-24.
  experimental: { useOffline: true },
}

export default nextConfig
