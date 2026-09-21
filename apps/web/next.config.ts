import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@agenda/domain"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "http", hostname: "127.0.0.1", port: "54321", pathname: "/storage/**" },
      { protocol: "http", hostname: "localhost", port: "54321", pathname: "/storage/**" },
    ],
  },
};

export default nextConfig;
