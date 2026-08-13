import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Las fotos viven en Supabase Storage (bucket público fotos-propiedades)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
