import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const backendOrigin = process.env.NESTJS_API_URL
  ? process.env.NESTJS_API_URL.replace(/\/api\/?$/, "")
  : "http://localhost:3001";

const nextConfig: NextConfig = {
  // Self-contained server bundle (only traced runtime deps) — keeps the Docker
  // runtime image small and its export layer tiny.
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  images: {
    // Mock/sample listing photos are served from Unsplash. When the real
    // backend + storage (AWS S3 / Cloudflare R2 per the SRS) is wired in,
    // replace this with the actual asset host(s).
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  async rewrites() {
    return [
      {
        source: "/public/:path*",
        destination: `${backendOrigin}/public/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
