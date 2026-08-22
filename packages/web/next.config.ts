import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const currentDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(currentDir, "../.."),
  outputFileTracingIncludes: {
    "/*": ["../../yuiju.config.json"],
  },
};

export default nextConfig;
