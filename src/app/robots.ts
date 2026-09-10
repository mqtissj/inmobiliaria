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
/*
  LOS RASPADORES DE IA NO ENTRAN.

  Medido el 10/9/2026 con `vercel metrics ... --group-by bot_name`: en 48 horas
  `meta-externalagent` hizo 786.170 pedidos de los 786.734 totales. El 99,93%.
  Gente de verdad: 571. Googlebot: 27.

  No es tráfico que sirva para nada — no compra, no consulta y no indexa. Solo
  se lleva el contenido para entrenar modelos, y de paso se bajó el video de
  Santander (2,4 MB) 41.276 veces en esos dos días: unos 99 GB.

  Esto es la mitad EDUCADA del arreglo y no alcanza sola: robots.txt es una
  sugerencia. La mitad que de verdad corta es la regla del firewall de Vercel,
  que bloquea en el borde antes de que el pedido cueste plata.
*/
const CRAWLERS_DE_IA = [
  'meta-externalagent', // el que disparó todo esto
  'GPTBot',
  'OAI-SearchBot',
  'ClaudeBot',
  'anthropic-ai',
  'CCBot',
  'PerplexityBot',
  'Bytespider',
  'Amazonbot',
  'Applebot-Extended',
  'Google-Extended', // solo entrenamiento: NO afecta a Googlebot ni al ranking
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: CRAWLERS_DE_IA,
        disallow: '/',
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin', // el panel entero
          '/login',
          '/recuperar',
          '/nueva-contrasena',
          '/auth/', // el callback de los links de mail
          /*
            LA HOME CON FILTROS NO SE RECORRE. Esta línea es la que baja la cuenta
            de Supabase, así que no sacarla sin mirar el consumo primero.

            Los 18 chips de filtro se combinan entre sí (?operacion=venta&tipo=casa
            &caract=parrillero,barbacoa&...), o sea que la home existe en miles de
            URLs distintas, todas con 200 y todas linkeadas desde la home. Para un
            buscador eso es una invitación a recorrerlas todas, y cada una le cuesta
            a la base 5 consultas.

            Medido el 6/9/2026: 14 millones de llamadas a Supabase en 30 días. Que
            eran crawlers y no gente se ve en la proporción — propiedades_publicas
            contra config_negocio da 2:1 exacto, que es lo que gasta un render SIN
            JavaScript; un navegador de verdad da 5:1. Y propiedad_fotos tenía 51K
            contra 7,2M: nadie estaba entrando a las fichas.

            No se pierde NADA de SEO: todas estas URLs ya declaran la home como
            canónica (ver src/app/(public)/page.tsx), así que Google nunca las iba a
            indexar — solo las recorría. Las páginas que sí importan (la home, las
            institucionales y las fichas) siguen permitidas y están en el sitemap.
          */
          '/?*',
        ],
      },
    ],
    sitemap: urlAbsoluta('/sitemap.xml'),
    host: SITIO,
  }
}
