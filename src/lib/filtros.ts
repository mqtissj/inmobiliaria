import { CARACTERISTICAS_VALIDAS, IDEAL_PARA, OPERACIONES, TIPOS_PATIO } from './types'
import type { Propiedad } from './types'

/*
  Los filtros del listado, en un archivo SIN dependencias de servidor.

  POR QUÉ ESTÁ SEPARADO DE queries.ts
  Desde el 7/9/2026 el filtrado corre en el NAVEGADOR, para que la home pueda
  ser una página estática servida por el CDN en vez de ejecutar una función en
  cada visita. Eso obliga a que este código entre al bundle del cliente, y
  queries.ts no puede: importa el cliente de Supabase y `unstable_cache`.

  Acá adentro no hay más dependencia que los vocabularios de types.ts. Lo usan
  los dos lados y por eso el resultado es el mismo en los dos:
   - el servidor, para el sitemap y para el listado completo del HTML inicial;
   - el navegador, para aplicar los filtros de la URL.
*/

export interface FiltrosListado {
  operacion?: string
  tipo?: string
  dormitorios?: number
  banos?: number
  patio?: string
  /** Vale más de una a la vez, y suman: pedir parrillero Y barbacoa trae las que tienen ambas */
  caracteristicas?: string[]
  garaje?: boolean
  /** 'si' | 'no' — el cliente pidió poder buscar las DOS cosas, no solo las que aceptan */
  mascotas?: 'si' | 'no'
  ideal?: string
}

/*
  Lee los filtros de la URL. Sirve para un URLSearchParams del navegador y para
  el searchParams del servidor, porque solo pide `get`.

  TODO valor se valida contra los vocabularios de types.ts: lo que no está en la
  lista no filtra. Un `?operacion=cualquiera` muestra todo, no cero resultados —
  criterio de siempre, y está cubierto en scripts/verificar-filtros.mjs.
*/
export function leerFiltros(params: { get(clave: string): string | null }): FiltrosListado {
  const texto = (clave: string) => params.get(clave) ?? undefined
  const enLista = (clave: string, validos: readonly string[]) => {
    const v = params.get(clave)
    return v && validos.includes(v) ? v : undefined
  }

  const mascotas = params.get('mascotas')

  return {
    operacion: enLista('operacion', OPERACIONES),
    tipo: texto('tipo'),
    // Number('abc') es NaN y NaN || undefined cae en undefined: un valor basura
    // en la URL simplemente no filtra, no rompe.
    dormitorios: Number(texto('dormitorios')) || undefined,
    banos: Number(texto('banos')) || undefined,
    patio: enLista('patio', TIPOS_PATIO),
    caracteristicas: (texto('caract') ?? '')
      .split(',')
      .map((c) => c.trim())
      .filter((c) => CARACTERISTICAS_VALIDAS.includes(c)),
    garaje: params.get('garaje') === 'si',
    mascotas: mascotas === 'si' ? 'si' : mascotas === 'no' ? 'no' : undefined,
    ideal: enLista('ideal', IDEAL_PARA),
  }
}

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
  const ideal = filtros.ideal
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
