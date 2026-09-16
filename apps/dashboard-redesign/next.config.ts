import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  agentRules: false,
  async rewrites() {
    const apiTarget = process.env.API_INTERNAL_PORT ?? "4001";
    return [
      {
        source: "/api/:path*",
        destination: `http://127.0.0.1:${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;