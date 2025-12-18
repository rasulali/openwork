import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactCompiler: true,
  allowedDevOrigins: ["http://localhost:3000", "http://192.168.0.108:3000"],
};

export default nextConfig;
