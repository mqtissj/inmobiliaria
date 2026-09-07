import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { supabase } from './supabase'
import { CARACTERISTICAS_VALIDAS, IDEAL_PARA, OPERACIONES, TIPOS_PATIO } from './types'
import type { ConfigNegocio, Faq, Propiedad, PropiedadFoto } from './types'

/*
  Lecturas públicas de la web.

  La web NO lee la tabla `propiedades`: lee la view `propiedades_publicas`
  (docs/sql/2026-08-13-public-view-and-panel-policies.sql). La view devuelve
  precio null cuando precio_publico es false y dirección null cuando
  mostrar_direccion es false — así el dato sensible nunca sale de la base,
  ni siquiera para quien consulte la API directo con la anon key.
  Mismo guardrail estructural que va a usar el bot (CLAUDE.md §4.2).

  ACÁ HAY DOS CACHÉS Y HACEN COSAS DISTINTAS:

   - `cache()` de React deduplica DENTRO de un request: si el layout y la página
     piden la config, a la base va una sola consulta.
   - `unstable_cache()` de Next guarda ENTRE requests: la visita siguiente no
     toca la base para nada.

  La segunda se agregó el 6/9/2026 y es la que controla el costo. Ver el bloque
  de TIEMPO_CACHE.
*/

const VIEW_PUBLICA = 'propiedades_publicas'

/*
  POR QUÉ HAY CACHÉ ENTRE REQUESTS, Y POR QUÉ NO CONVIENE SACARLA

  Hasta el 6/9/2026 cada visita consultaba la base: 5 consultas por render de la
  home. Con los crawlers recorriendo las combinaciones de filtros, eso dio
  14 MILLONES de llamadas a Supabase en 30 días para un sitio con 8 propiedades
  publicadas.

  El `Disallow: /?*` de robots.ts saca a los buscadores que se portan bien, pero
  robots.txt es una sugerencia y varios scrapers la ignoran. Esta caché es la
  mitad que NO depende de eso: por más veces que pidan la home, la base se
  consulta una vez cada TIEMPO_CACHE.

  300 segundos es el mismo número que ya venía usando la ficha de propiedad.
  Deja el piso en ~1.150 consultas por día contra las ~470.000 que se hacían.

  Las propiedades además se invalidan AL INSTANTE cuando el panel publica o
  edita (revalidateTag en src/app/admin/propiedades/actions.ts), así que para
  ellas los 300 segundos son solo una red de seguridad. OJO con config_negocio y
  faqs: el panel NO las toca, se editan a mano en Supabase, así que ahí el TTL
  es el único refresco — un cambio de teléfono tarda hasta 5 minutos en verse.
*/
const TIEMPO_CACHE = 300

/** Lo usa el panel para que un cambio se vea al instante, sin esperar el TTL. */
export const TAG_PROPIEDADES = 'propiedades'

/*
  Respaldo de los datos del negocio. NO es la fuente de verdad: manda la tabla
  config_negocio, y si la inmobiliaria cambia el horario se cambia ahí.

  Existe por el incidente del 28/8/2026: Supabase devolvió páginas HTML de
  error (504, 525 y 520 de Cloudflare) en vez de JSON, getConfig() tiró, y como
  corre en el layout público ese throw se llevó puesta TODA la web con un 500 —
  la home, contacto, términos, privacidad y cada ficha de propiedad. Un hipo de
  la base no puede dejar a la inmobiliaria sin sitio.

  Un teléfono viejo por unos minutos es muchísimo mejor que un 500. Si el
  cliente cambia estos datos, actualizarlos también acá: son los mismos que
  carga scripts/setup-dev.mjs.
*/
const CONFIG_RESPALDO: ConfigNegocio = {
  nombre: 'PF Negocios Inmobiliarios',
  direccion: '25 de Mayo 329, Tacuarembó',
  telefono: '098 756 490',
  horario: 'Lunes a viernes de 9 a 12 y de 15:30 a 18',
  whatsapp: '59898756490', // formato wa.me, sin + ni espacios
  instagram: 'pf_negocios_inmobiliarios',
  facebook: 'inmb.catalina',
}

/*
  OJO CON EL ORDEN: la lectura va ADENTRO de la caché y el respaldo AFUERA.

  Si el try/catch envolviera a la caché, un hipo de Supabase de dos minutos
  quedaría guardado como "acá va el respaldo" por los 300 segundos enteros, y el
  sitio mostraría los datos de respaldo aunque la base ya se hubiera recuperado.
  Con el throw adentro el error no se cachea: el request siguiente reintenta.
*/
const leerConfigDeLaBase = unstable_cache(
  async (): Promise<Partial<ConfigNegocio>> => {
    const { data, error } = await supabase.from('config_negocio').select('clave, valor')
    if (error) throw new Error(error.message)
    // Clave vacía o faltante cae al respaldo: media config es peor que ninguna
    // — un whatsapp vacío es un link roto en el header de todas las páginas.
    return Object.fromEntries((data ?? []).filter((r) => r.valor).map((r) => [r.clave, r.valor]))
  },
  ['config-negocio'],
  { revalidate: TIEMPO_CACHE }
)

export const getConfig = cache(async (): Promise<ConfigNegocio> => {
  try {
    return { ...CONFIG_RESPALDO, ...(await leerConfigDeLaBase()) }
  } catch (e) {
    // Queda en los logs de Vercel a propósito: el sitio no se cae, pero el
    // problema tiene que seguir siendo visible para nosotros.
    console.error('config_negocio no se pudo leer, se usa el respaldo:', e)
    return CONFIG_RESPALDO
  }
})

export interface FiltrosListado {
  operacion?: string
  tipo?: string
  dormitorios?: number
  /** 'si' | 'no' — el cliente pidió poder buscar las DOS cosas, no solo las que aceptan */
  mascotas?: 'si' | 'no'
  idealPara?: string
  banos?: number
  patio?: string
  /** Vale más de una a la vez, y suman: pedir parrillero Y barbacoa trae las que tienen ambas */
  caracteristicas?: string[]
  garaje?: boolean
}

/*
  UNA sola lectura del listado, cacheada. Los filtros se aplican en memoria.

  Antes cada combinación de filtros era su propia consulta con WHERE. Con 8
  propiedades publicadas, eso es pedirle a Postgres por internet que filtre 8
  filas: la home hacía DOS consultas por render (la filtrada y la completa, para
  armar los chips) y ninguna se reaprovechaba, porque cada combinación de la URL
  generaba un WHERE distinto y por lo tanto una entrada de caché distinta.

  Trayendo la lista entera una vez, TODAS las combinaciones salen de la misma
  caché. La home ya derivaba los chips disponibles en memoria desde `todas`, así
  que el patrón no es nuevo: ahora también sale de ahí el listado filtrado.

  Si algún día hay cientos de propiedades esto hay que repensarlo. Con decenas,
  filtrar en JS es gratis al lado de una ida a la base.

  El cache() de React de afuera NO es redundante: con la caché fría, la home
  pide el listado DOS veces en el mismo Promise.all (la filtrada y la completa
  para armar los chips) y las dos fallan a la vez. Medido: sin esto salían 2
  consultas en el mismo render; con esto, una.
*/
const leerTodasLasPropiedades = cache(
  unstable_cache(
    async (): Promise<Propiedad[]> => {
      const { data, error } = await supabase
        .from(VIEW_PUBLICA)
        .select('*')
        .order('destacada', { ascending: false })
        .order('creado_en', { ascending: false })
      if (error) throw new Error(`No se pudo leer el listado: ${error.message}`)
      return (data ?? []) as Propiedad[]
    },
    ['propiedades-publicas'],
    { revalidate: TIEMPO_CACHE, tags: [TAG_PROPIEDADES] }
  )
)

/*
  Los mismos filtros que antes armaba el WHERE, ahora en memoria. Cada bloque
  conserva el criterio original — están verificados uno por uno contra el
  resultado del query equivalente (scripts/verificar-filtros.mjs).

  El orden lo pone la base (destacada, después creado_en) y filtrar no lo altera:
  Array.filter conserva el orden de entrada.
*/
export function filtrarPropiedades(
  propiedades: Propiedad[],
  filtros: FiltrosListado
): Propiedad[] {
  let r = propiedades

  // Los valores se validan contra las listas de types.ts: un valor inventado en
  // la URL simplemente no filtra (no rompe ni filtra mal).
  const operacion = filtros.operacion
  if (operacion && (OPERACIONES as readonly string[]).includes(operacion)) {
    r = r.filter((p) => p.operacion === operacion)
  }

  const tipo = filtros.tipo
  if (tipo) r = r.filter((p) => p.tipo === tipo)

  // eq exacto: "2 dormitorios" trae las de 2, no las de 2 o más (pedido del
  // cliente, 15/8). Desde el 17/8 el filtro es un select de 1 al máximo cargado,
  // así que SÍ se puede elegir una cantidad sin resultados: en ese caso la home
  // muestra el estado vacío con el WhatsApp para avisar.
  const dormitorios = filtros.dormitorios
  if (dormitorios) r = r.filter((p) => p.dormitorios === dormitorios)

  // Mascotas es de TRES estados, no dos: sin filtro trae todo, 'no' trae
  // explícitamente las que NO aceptan (alguien con alergia también busca). Las
  // que tienen el dato en null no entran en ninguno de los dos: no sabemos.
  if (filtros.mascotas === 'si') r = r.filter((p) => p.acepta_mascotas === true)
  else if (filtros.mascotas === 'no') r = r.filter((p) => p.acepta_mascotas === false)

  // ideal_para es un array: una casa puede servir para familia Y pareja, y tiene
  // que aparecer en los dos filtros.
  const ideal = filtros.idealPara
  if (ideal && (IDEAL_PARA as readonly string[]).includes(ideal)) {
    r = r.filter((p) => p.ideal_para?.includes(ideal) ?? false)
  }

  const banos = filtros.banos
  if (banos) r = r.filter((p) => p.banos === banos)

  const patio = filtros.patio
  if (patio && (TIPOS_PATIO as readonly string[]).includes(patio)) {
    r = r.filter((p) => p.patio === patio)
  }

  // Suman, no acumulan: marcar parrillero Y barbacoa achica la búsqueda, no la
  // agranda — que es lo que espera quien usa filtros. Es el `@>` de Postgres.
  const caracteristicas = (filtros.caracteristicas ?? []).filter((c) =>
    CARACTERISTICAS_VALIDAS.includes(c)
  )
  if (caracteristicas.length > 0) {
    r = r.filter((p) => caracteristicas.every((c) => p.caracteristicas?.includes(c) ?? false))
  }

  // El garaje viaja aparte de las características porque es una columna propia
  // que existe desde F0 (la nota completa está en el SQL). Para quien mira la
  // web es un chip más, al lado de "Cochera".
  if (filtros.garaje) r = r.filter((p) => p.garage === true)

  return r
}

export async function getPropiedadesPublicas(filtros: FiltrosListado = {}): Promise<Propiedad[]> {
  return filtrarPropiedades(await leerTodasLasPropiedades(), filtros)
}

export const getPropiedadPorCodigo = cache(async (codigo: string): Promise<Propiedad | null> => {
  // Sale de la MISMA lista cacheada que el listado —es la misma view, no hay
  // dato nuevo que ir a buscar—, así que la ficha dejó de pegarle a la base.
  // Los códigos se guardan en mayúscula (TB-001) pero la URL llega como quiera:
  // esto es el equivalente del `ilike` sin comodines que se usaba antes.
  const buscado = codigo.toLowerCase()
  const todas = await leerTodasLasPropiedades()
  return todas.find((p) => p.codigo.toLowerCase() === buscado) ?? null
})

const leerFotos = unstable_cache(
  async (propiedadId: string): Promise<PropiedadFoto[]> => {
    const { data, error } = await supabase
      .from('propiedad_fotos')
      .select('*')
      .eq('propiedad_id', propiedadId)
      .order('es_portada', { ascending: false })
      .order('orden', { ascending: true })
    if (error) throw new Error(`No se pudieron leer las fotos: ${error.message}`)
    return (data ?? []) as PropiedadFoto[]
  },
  ['fotos-de-propiedad'],
  { revalidate: TIEMPO_CACHE, tags: [TAG_PROPIEDADES] }
)

// El id entra en la clave de caché solo: unstable_cache usa los argumentos.
export const getFotos = cache((propiedadId: string) => leerFotos(propiedadId))

/*
  Portadas del listado. Se traen TODAS de una sola vez y se cachean.

  Antes el query filtraba por los ids visibles, así que cada combinación de
  filtros pedía un juego distinto de ids y la caché no servía de nada. Traer
  todas y elegir en memoria hace que cualquier filtro reuse la misma entrada.

  Vuelve un array de pares y no un Map porque unstable_cache guarda JSON, y un
  Map serializado se convierte en `{}`.
*/
const leerTodasLasPortadas = unstable_cache(
  async (): Promise<[string, string][]> => {
    const { data, error } = await supabase
      .from('propiedad_fotos')
      .select('propiedad_id, url, es_portada, orden')
      .order('es_portada', { ascending: false })
      .order('orden', { ascending: true })
    if (error) throw new Error(`No se pudieron leer las portadas: ${error.message}`)
    const mapa = new Map<string, string>()
    for (const f of data ?? []) {
      if (!mapa.has(f.propiedad_id)) mapa.set(f.propiedad_id, f.url)
    }
    return [...mapa]
  },
  ['portadas'],
  { revalidate: TIEMPO_CACHE, tags: [TAG_PROPIEDADES] }
)

export async function getPortadas(propiedadIds: string[]): Promise<Map<string, string>> {
  if (propiedadIds.length === 0) return new Map()
  try {
    const todas = new Map(await leerTodasLasPortadas())
    const mapa = new Map<string, string>()
    for (const id of propiedadIds) {
      const url = todas.get(id)
      if (url) mapa.set(id, url)
    }
    return mapa
  } catch {
    return new Map() // sin fotos no se rompe el listado: cae al placeholder
  }
}

const leerFaqs = unstable_cache(
  async (): Promise<Faq[]> => {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('activa', true)
      .order('orden', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []) as Faq[]
  },
  ['faqs'],
  { revalidate: TIEMPO_CACHE }
)

export const getFaqs = cache(async (): Promise<Faq[]> => {
  try {
    return await leerFaqs()
  } catch {
    return [] // la home vive sin FAQs; no vale la pena romperla por esto
  }
})
