import type { MetadataRoute } from 'next'
import { SITIO, urlAbsoluta } from '@/lib/site'

/*
  robots.txt generado por Next (docs de esta versión:
  node_modules/next/dist/docs/.../01-metadata/robots.md).

  Las páginas privadas ya llevan `robots: { index: false }` en su metadata, que
  es lo que de verdad las saca del índice. Esto es la otra mitad: le pide a los
  buscadores que directamente no las recorran. Las dos cosas se complementan —
  un Disallow acá NO garantiza que una URL no aparezca en Google si alguien la
  linkea; el noindex de la página sí.

  OJO con el orden: si una ruta está en Disallow, el robot no la visita y por
  lo tanto NUNCA LEE su noindex. Por eso /login y las de recuperación van en
  las dos listas: son irrelevantes para el buscador y no queremos que las toque.
*/
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin', // el panel entero
        '/login',
        '/recuperar',
        '/nueva-contrasena',
        '/auth/', // el callback de los links de mail
      ],
    },
    sitemap: urlAbsoluta('/sitemap.xml'),
    host: SITIO,
  }
}
