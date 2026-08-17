/*
  La URL pública del sitio, en UN solo lugar.

  Hasta ahora estaba clavada en layout.tsx. Eso funciona mientras el sitio viva
  en la URL de Vercel, pero el día que se conecte el dominio real, todo lo que
  se arma con esta base —las imágenes de OG que se ven al compartir por
  WhatsApp, las URLs canónicas, el sitemap— seguiría apuntando al dominio viejo.

  Se lee de NEXT_PUBLIC_SITE_URL. Si no está, cae a la de Vercel, así nada se
  rompe hoy. Cuando conectes el dominio, cargás esa variable en Vercel
  (Production y Preview) y listo: no hay que tocar código.

  Sin barra final: todas las URLs se arman como `${SITIO}/algo`.
*/
const PREDETERMINADA = 'https://inmobiliaria-pi-vert.vercel.app'

export const SITIO = (process.env.NEXT_PUBLIC_SITE_URL || PREDETERMINADA).replace(/\/+$/, '')

/** true cuando todavía no se configuró el dominio real. Lo usa robots.ts. */
export const ES_DOMINIO_PROVISORIO = SITIO === PREDETERMINADA

export function urlAbsoluta(ruta: string): string {
  return `${SITIO}${ruta.startsWith('/') ? ruta : `/${ruta}`}`
}
