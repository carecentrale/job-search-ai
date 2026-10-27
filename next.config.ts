import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // unpdf ships a large PDF.js build; keep it out of the bundle and load it at runtime.
  serverExternalPackages: ["unpdf"],
};

export default nextConfig;
