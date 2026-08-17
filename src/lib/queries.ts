import { cache } from 'react'
import { supabase } from './supabase'
import { IDEAL_PARA, OPERACIONES } from './types'
import type { ConfigNegocio, Faq, Propiedad, PropiedadFoto } from './types'

/*
  Lecturas públicas de la web.

  La web NO lee la tabla `propiedades`: lee la view `propiedades_publicas`
  (docs/sql/2026-08-13-public-view-and-panel-policies.sql). La view devuelve
  precio null cuando precio_publico es false y dirección null cuando
  mostrar_direccion es false — así el dato sensible nunca sale de la base,
  ni siquiera para quien consulte la API directo con la anon key.
  Mismo guardrail estructural que va a usar el bot (CLAUDE.md §4.2).

  cache() de React deduplica: si layout y page piden la config en el mismo
  request, a la base va un solo query.
*/

const VIEW_PUBLICA = 'propiedades_publicas'

export const getConfig = cache(async (): Promise<ConfigNegocio> => {
  const { data, error } = await supabase.from('config_negocio').select('clave, valor')
  if (error) throw new Error(`No se pudo leer la configuración: ${error.message}`)
  return Object.fromEntries((data ?? []).map((r) => [r.clave, r.valor])) as ConfigNegocio
})

export interface FiltrosListado {
  operacion?: string
  tipo?: string
  dormitorios?: number
  mascotas?: boolean
  idealPara?: string
}

export const getPropiedadesPublicas = cache(async (filtros: FiltrosListado = {}): Promise<Propiedad[]> => {
  let query = supabase
    .from(VIEW_PUBLICA)
    .select('*')
    .order('destacada', { ascending: false })
    .order('creado_en', { ascending: false })

  // Los valores se validan contra las listas de types.ts antes de ir al query:
  // un valor inventado en la URL simplemente no filtra (no rompe ni filtra mal).
  if (filtros.operacion && (OPERACIONES as readonly string[]).includes(filtros.operacion)) {
    query = query.eq('operacion', filtros.operacion)
  }
  if (filtros.tipo) {
    query = query.eq('tipo', filtros.tipo)
  }
  // Pedido del cliente (15/8): poder filtrar por cantidad de dormitorios.
  // eq exacto: los chips se derivan de los valores realmente cargados, así
  // que nunca se ofrece un número sin resultados.
  if (filtros.dormitorios) {
    query = query.eq('dormitorios', filtros.dormitorios)
  }
  // Pedidos del cliente (17/8): mascotas y público ideal.
  if (filtros.mascotas) {
    query = query.eq('acepta_mascotas', true)
  }
  // contains porque ideal_para es un array: una casa puede servir para
  // familia Y pareja, y tiene que aparecer en los dos filtros.
  if (filtros.idealPara && (IDEAL_PARA as readonly string[]).includes(filtros.idealPara)) {
    query = query.contains('ideal_para', [filtros.idealPara])
  }

  const { data, error } = await query
  if (error) throw new Error(`No se pudo leer el listado: ${error.message}`)
  return (data ?? []) as Propiedad[]
})

export const getPropiedadPorCodigo = cache(async (codigo: string): Promise<Propiedad | null> => {
  // Los códigos se guardan en mayúscula (TB-001) pero la URL llega como quiera
  const { data, error } = await supabase
    .from(VIEW_PUBLICA)
    .select('*')
    .ilike('codigo', codigo)
    .maybeSingle()
  if (error) throw new Error(`No se pudo leer la propiedad: ${error.message}`)
  return data as Propiedad | null
})

export const getFotos = cache(async (propiedadId: string): Promise<PropiedadFoto[]> => {
  const { data, error } = await supabase
    .from('propiedad_fotos')
    .select('*')
    .eq('propiedad_id', propiedadId)
    .order('es_portada', { ascending: false })
    .order('orden', { ascending: true })
  if (error) throw new Error(`No se pudieron leer las fotos: ${error.message}`)
  return (data ?? []) as PropiedadFoto[]
})

// Portadas para el listado: un query para todas las tarjetas, no uno por tarjeta
export const getPortadas = cache(async (propiedadIds: string[]): Promise<Map<string, string>> => {
  if (propiedadIds.length === 0) return new Map()
  const { data, error } = await supabase
    .from('propiedad_fotos')
    .select('propiedad_id, url, es_portada, orden')
    .in('propiedad_id', propiedadIds)
    .order('es_portada', { ascending: false })
    .order('orden', { ascending: true })
  if (error) return new Map() // sin fotos no se rompe el listado: cae al placeholder
  const mapa = new Map<string, string>()
  for (const f of data ?? []) {
    if (!mapa.has(f.propiedad_id)) mapa.set(f.propiedad_id, f.url)
  }
  return mapa
})

export const getFaqs = cache(async (): Promise<Faq[]> => {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .eq('activa', true)
    .order('orden', { ascending: true })
  if (error) return [] // la home vive sin FAQs; no vale la pena romperla por esto
  return (data ?? []) as Faq[]
})
