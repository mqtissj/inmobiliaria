import type { Metadata } from "next";
import { Geist, Source_Serif_4 } from "next/font/google";
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
  metadataBase: new URL("https://inmobiliaria-pi-vert.vercel.app"),
  title: {
    default: "PF Negocios Inmobiliarios — Tacuarembó",
    template: "%s · PF Negocios Inmobiliarios",
  },
  description:
    "Casas, apartamentos, campos y chacras en venta y alquiler en Tacuarembó. Corredores oficiales de SURA y PORTO, desde 2021.",
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
    <html
      lang="es-UY"
      className={`${geistSans.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
