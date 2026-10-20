import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The whole app is prerendered (every route is marked "○ Static"), so it
  // deploys as plain static files on Cloudflare Pages. No server runtime, no
  // Next.js server, nothing to keep warm. If a route ever needs runtime
  // rendering, this has to move to @opennextjs/cloudflare instead.
  output: "export",

  // Static export has no image optimisation server; there is no next/image
  // usage today, but this keeps a future one from silently breaking the build.
  images: { unoptimized: true },
};

export default nextConfig;
