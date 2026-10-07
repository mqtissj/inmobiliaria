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
    // 31 días. Next 16 trae 4 horas por defecto, o sea que el optimizador de
    // Vercel vuelve a bajar cada original de Supabase 6 veces por día. Eso es
    // egress de Supabase, que en el plan Free son 5 GB por mes.
    //
    // Subirlo a 31 días es seguro PORQUE LAS URLS SON INMUTABLES: cada foto se
    // sube a `${codigo}/${Date.now()}-${n}.${ext}` (ver PropertyForm.tsx), así
    // que cambiar una foto genera una ruta nueva y nunca pisa la vieja. Si
    // algún día se sube reemplazando el mismo path, esto hay que bajarlo o la
    // CDN sirve la foto vieja hasta un mes.
    //
    // El valor que manda es el más GRANDE entre esto y el Cache-Control que
    // devuelve Supabase (1 hora), así que gana este.
    minimumCacheTTL: 2678400,
  },
};

export default nextConfig;
