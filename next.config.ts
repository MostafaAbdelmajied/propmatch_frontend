import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { getConfiguredBackendUrl } from "./src/lib/api/backendEnvironment";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const backendOrigin = getConfiguredBackendUrl().replace(/\/api$/, "");

// Browser-facing backend origin where chat media (/public/...) is served —
// same value the client uses for mediaUrl() and the socket.
const mediaOrigin = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";

/**
 * Scoped image CSP — defense-in-depth behind the JS allowlist in
 * UnifiedAiAssistant. Only `img-src` is declared (no `default-src`), so scripts,
 * styles, fonts, XHR and the websocket stay unrestricted and can't break; this
 * directive alone stops a model-emitted `<img>` from beaconing user data to an
 * arbitrary host. Allowed: same origin (guide images, /public rewrite,
 * /_next/image), data:/blob: previews, the backend media origin (chat images),
 * and Unsplash (sample listing photos).
 */
const imgCsp = [
  "img-src 'self' data: blob:",
  mediaOrigin,
  "https://images.unsplash.com",
]
  .filter(Boolean)
  .join(" ");

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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: imgCsp }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
