import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const apiUrl = process.env.AMAZON_REVIEW_API_URL || "http://localhost:8002";

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
