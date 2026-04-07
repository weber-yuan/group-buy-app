import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'bcryptjs'],
  devIndicators: false,
};

export default nextConfig;
