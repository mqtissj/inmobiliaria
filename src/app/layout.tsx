import type { Metadata } from "next";
import { Geist, Source_Serif_4 } from "next/font/google";
import { SITIO } from "@/lib/site";
import "./globals.css";

// Sans para todo; serif solo en títulos y precios (el logo de PF es serif —
// decisión del 12/8, registrada en el spec).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Sale de NEXT_PUBLIC_SITE_URL (ver src/lib/site.ts). El día que se conecte
  // el dominio real se cambia la variable en Vercel, no el código — si esto
  // quedara clavado, las imágenes que se ven al compartir por WhatsApp y las
  // URLs canónicas seguirían apuntando al dominio viejo.
  metadataBase: new URL(SITIO),
  alternates: { canonical: "/" },
  title: {
    default: "PF Negocios Inmobiliarios — Tacuarembó",
    template: "%s · PF Negocios Inmobiliarios",
  },
  description:
    "Casas, apartamentos, campos y chacras en venta, alquiler y traspaso en Tacuarembó. Corredores de garantías MAPFRE y SURA, agentes MiCasa de Banco Santander. Desde 2021.",
  openGraph: {
    type: "website",
    locale: "es_UY",
    siteName: "PF Negocios Inmobiliarios",
    title: "PF Negocios Inmobiliarios — Tacuarembó",
    description:
      "Casas, apartamentos, campos y chacras en venta y alquiler en Tacuarembó.",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning en <html> y <body>: las extensiones del navegador
    // (traductores, gestores de contraseñas, el puente de VS Code que agrega la
    // clase `vsc-initialized`) escriben en estas dos etiquetas ANTES de que React
    // hidrate. React compara y avisa de un desajuste que no es del código, y en
    // desarrollo eso abre el overlay de error de Next tapando la pantalla.
    // Solo silencia UN nivel — los atributos de estas dos etiquetas exactas —,
    // así que un desajuste de hidratación real dentro de la app sigue apareciendo.
    <html
      lang="es-UY"
      className={`${geistSans.variable} ${sourceSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
