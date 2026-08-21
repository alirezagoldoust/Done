import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle so the Docker runtime image
  // only needs the standalone output instead of the full node_modules.
  output: "standalone",
};

export default nextConfig;
