import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // required if you're using <Image />
  },
};

export default nextConfig;
