import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // 프로젝트 디렉터리를 루트로 고정
    root: __dirname,
  },
};

export default nextConfig;
