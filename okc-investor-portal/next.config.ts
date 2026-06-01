import type { NextConfig } from "next";

const authApiOrigin = process.env.AUTH_API_ORIGIN ?? "http://localhost:5000";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${authApiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
