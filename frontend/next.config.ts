import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "predicciones-ecuador.vercel.app" }],
        destination: "https://ecuapred.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
