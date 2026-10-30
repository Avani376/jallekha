import type { NextConfig } from "next";

/**
 * Default build: standard Next.js server build (works on Vercel / `next start`).
 * `NEXT_STATIC=1 npm run build:static` produces a fully static export in
 * `out/` for any static host (the demo is 100% client-side: browser-local
 * storage, no server routes, no secrets).
 */
const isStatic = process.env.NEXT_STATIC === "1";

const nextConfig: NextConfig = {
  ...(isStatic ? { output: "export" as const } : {}),
  // PPR/streaming features require a server runtime; static export disables them.
  ...(isStatic ? { cacheComponents: false, partialPrefetching: false } : { cacheComponents: true, partialPrefetching: true }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
