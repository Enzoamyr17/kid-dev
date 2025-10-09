import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // enables static HTML export
  images: {
    unoptimized: true, // required if you're using <Image />
  },

};

export default nextConfig;
