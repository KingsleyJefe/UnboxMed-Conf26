import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js"],
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/@fontsource/chewy/files/chewy-latin-400-normal.woff",
      "./node_modules/@fontsource/geist/files/geist-latin-400-normal.woff",
      "./node_modules/@fontsource/geist/files/geist-latin-700-normal.woff",
      "./public/images/ticket-background.svg",
      "./public/images/ticket-glow.svg",
      "./public/images/ticket-bts-logo.png",
      "./public/images/ticket-pattern-mark.svg",
    ],
  },
};

export default nextConfig;
