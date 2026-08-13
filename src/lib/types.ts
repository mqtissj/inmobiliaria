// Tipos de la base de datos.
// Escritos a mano desde el esquema REAL verificado contra Supabase el 13/8/2026
// (script scripts/setup-dev.mjs descubre los enums probando contra la base).

// Enums reales de Postgres (operacion_t y estado_t) — verificados por inserción de prueba
export type Operacion = 'venta' | 'alquiler'
export type EstadoPropiedad = 'disponible' | 'reservada' | 'vendida' | 'alquilada'
export type Moneda = 'USD' | 'UYU'

// `tipo` es texto libre en la base; este es el vocabulario que usa el formulario del panel
export const TIPOS_PROPIEDAD = ['casa', 'apartamento', 'campo', 'chacra', 'terreno', 'local', 'galpón'] as const
export type TipoPropiedad = (typeof TIPOS_PROPIEDAD)[number] | (string & {})

// Campos y chacras usan hectáreas/CONEAT; el resto, dormitorios/m².
// Regla de CLAUDE.md §5: urbano y rural conviven en la misma tabla, null en lo que no aplica.
export const TIPOS_RURALES = ['campo', 'chacra'] as const
export function esRural(tipo: string): boolean {
  return (TIPOS_RURALES as readonly string[]).includes(tipo)
}

export interface Propiedad {
  id: string
  codigo: string
  titulo: string
  descripcion: string | null
  operacion: Operacion
  tipo: TipoPropiedad
  estado: EstadoPropiedad
  departamento: string | null
  ciudad: string | null
  barrio: string | null
  direccion: string | null
  mostrar_direccion: boolean
  lat: number | null
  lng: number | null
  // En la view pública, `precio` llega null cuando precio_publico es false.
  precio: number | null
  moneda: Moneda
  precio_publico: boolean
  gastos_comunes: number | null
  // urbano
  dormitorios: number | null
  banos: number | null
  m2_edificados: number | null
  m2_terreno: number | null
  garage: boolean | null
  plantas: number | null
  // rural
  hectareas: number | null
  indice_coneat: number | null
  tiene_agua: boolean | null
  tiene_luz: boolean | null
  alambrado: boolean | null
  padron: string | null
  // alquiler
  requiere_garantia: boolean | null
  tipos_garantia: string[] | null
  acepta_mascotas: boolean | null
  destacada: boolean
  creado_en: string
  actualizado_en: string
}

export interface PropiedadFoto {
  id: string
  propiedad_id: string
  url: string
  orden: number
  es_portada: boolean
}

export interface Faq {
  id: string
  pregunta: string
  respuesta: string
  activa: boolean
  orden: number
}

// config_negocio es clave/valor; estas son las claves que la web usa
export type ConfigNegocio = Record<
  'nombre' | 'direccion' | 'telefono' | 'horario' | 'whatsapp' | 'instagram',
  string
>
