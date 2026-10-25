import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
