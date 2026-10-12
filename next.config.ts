import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** The public website, shown in the page editor's preview frame. */
function websiteOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_WEBSITE_URL ?? "https://premiumchecks.co.uk").origin;
  } catch {
    return "https://premiumchecks.co.uk";
  }
}

/**
 * The dashboard is private: nothing is indexed, framed or cached by shared caches. The browser
 * talks to this origin (the BFF routes call the backend server side) plus one exception:
 * certificate PDFs and media are uploaded straight to Cloudinary with a short lived signature
 * from the backend, so large files never pass through this server. Images may come from
 * Cloudinary, and the page editor previews the public website in a frame.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self'",
  "connect-src 'self' https://api.cloudinary.com",
  `frame-src ${websiteOrigin()}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  reactCompiler: true,
  typedRoutes: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  headers() {
    return Promise.resolve([{ source: "/:path*", headers: securityHeaders }]);
  },
  redirects() {
    // Invitation emails sent before the link moved to /invite.
    return Promise.resolve([{ source: "/accept-invite", destination: "/invite", permanent: true }]);
  },
};

export default nextConfig;
