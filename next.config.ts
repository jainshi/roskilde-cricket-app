import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/signin",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
