import type { MetadataRoute } from 'next'
import { getPropiedadesPublicas } from '@/lib/queries'
import { urlAbsoluta } from '@/lib/site'

/*
  sitemap.xml generado por Next (docs de esta versión:
  node_modules/next/dist/docs/.../01-metadata/sitemap.md).

  Es la lista que Google usa para encontrar las páginas sin tener que adivinar.
  Para una inmobiliaria importa más de lo que parece: las fichas de propiedad
  no están linkeadas desde ningún lado más que la home, y si una queda en la
  página 2 de un listado, sin sitemap puede tardar semanas en indexarse.

  Solo entran las páginas PÚBLICAS. El panel y las pantallas de acceso no van
  (además de estar en robots.ts y con noindex propio).

  Las propiedades salen de la MISMA view pública que lee la web
  (propiedades_publicas), así que una propiedad vendida o en borrador nunca
  puede colarse acá: el guardrail estructural también protege el sitemap.
*/
/*
  SIN ESTO EL SITEMAP SE CONGELA EN EL BUILD.

  Detectado en produccion el 18/8/2026: la home mostraba TB-008 pero el
  sitemap seguia listando solo TB-005/006/007, con `X-Vercel-Cache: HIT` y
  sin ceder ni con cache-buster. La ruta se prerenderizaba una sola vez, al
  compilar, y no se volvia a generar nunca.

  Para una inmobiliaria eso es grave y silencioso: el cliente carga una
  propiedad desde el panel, la ve publicada en la web, y Google no se entera
  hasta que alguien vuelva a deployar. Justo las fichas nuevas —las que mas
  interesa que se indexen rapido— son las que quedaban afuera.

  Con revalidate, Vercel regenera la pagina como maximo una vez por hora.
  Una hora es de sobra: Google no relee el sitemap mas seguido que eso, y
  mantiene el costo en practicamente cero (una consulta por hora, no una por
  visita). Ver docs de esta version en
  node_modules/next/dist/docs/.../03-file-conventions/route.md
*/
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Las institucionales, que existen siempre
  const fijas: MetadataRoute.Sitemap = [
    { url: urlAbsoluta('/'), changeFrequency: 'daily', priority: 1 },
    { url: urlAbsoluta('/contacto'), changeFrequency: 'monthly', priority: 0.8 },
    { url: urlAbsoluta('/privacidad'), changeFrequency: 'yearly', priority: 0.3 },
    { url: urlAbsoluta('/terminos'), changeFrequency: 'yearly', priority: 0.3 },
  ]

  try {
    const propiedades = await getPropiedadesPublicas({})
    const fichas: MetadataRoute.Sitemap = propiedades.map((p) => ({
      url: urlAbsoluta(`/propiedades/${p.codigo.toLowerCase()}`),
      // Para que Google sepa que una propiedad cambió de precio y la revisite
      lastModified: p.actualizado_en ? new Date(p.actualizado_en) : undefined,
      changeFrequency: 'weekly',
      priority: 0.9,
    }))
    return [...fijas, ...fichas]
  } catch {
    // Si la base no responde justo cuando Google pide el sitemap, es mejor
    // devolver las institucionales que romper con un 500: un sitemap que falla
    // seguido hace que el buscador lo consulte cada vez menos.
    return fijas
  }
}
