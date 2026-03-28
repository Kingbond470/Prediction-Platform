/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode for catching bugs early
  reactStrictMode: true,

  // Allow images from external sources if needed
  images: {
    remotePatterns: [],
  },

  // Security + performance headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Redirect .com → .in in production
  async redirects() {
    const isProd = process.env.NODE_ENV === "production";
    if (!isProd) return [];
    return [
      {
        source: "/(.*)",
        has: [{ type: "host", value: "iplprediction2026.com" }],
        destination: "https://iplprediction2026.in/:path*",
        permanent: true, // 301
      },
      {
        source: "/(.*)",
        has: [{ type: "host", value: "www.iplprediction2026.com" }],
        destination: "https://iplprediction2026.in/:path*",
        permanent: true,
      },
      {
        source: "/(.*)",
        has: [{ type: "host", value: "www.iplprediction2026.in" }],
        destination: "https://iplprediction2026.in/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
