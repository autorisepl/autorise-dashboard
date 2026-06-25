import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@anthropic-ai/sdk", "@notionhq/client"],
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  outputFileTracingExcludes: {
    "/api/workspace/tree": ["**"],
  },
};

export default nextConfig;
