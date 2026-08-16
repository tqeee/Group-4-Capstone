import type { NextConfig } from "next";

// Baseline security headers for a financial portal. HSTS only takes effect
// over HTTPS, so it is harmless in local dev.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Emits .next/standalone — a self-contained server.js plus a pruned
  // node_modules — so the Elastic Beanstalk bundle ships without source,
  // devDependencies, or an install step on the instance.
  output: "standalone",

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
