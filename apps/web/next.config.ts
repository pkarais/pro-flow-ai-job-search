import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@pro-flow/career-core"],
  turbopack: {
    root: path.resolve(/* turbopackIgnore: true */ process.cwd(), "../.."),
  },
};

export default nextConfig;
