import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 手書き氏名画像アップロード用。multipart/form-dataのオーバーヘッド分の
      // 余裕を持たせるため、5MBの画像上限に対して少し大きめに設定する。
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
