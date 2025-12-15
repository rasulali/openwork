import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactCompiler: true,
  allowedDevOrigins: ["http://localhost:3000", "http://192.168.1.111:3000"],
};

export default nextConfig;
