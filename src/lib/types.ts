// Tipos de la base de datos.
// Escritos a mano desde el esquema REAL verificado contra Supabase el 13/8/2026
// (script scripts/setup-dev.mjs descubre los enums probando contra la base).

// Enums reales de Postgres (operacion_t y estado_t) — verificados por inserción de prueba
// 'traspaso' se agregó el 17/8/2026 a pedido del cliente (docs/sql/2026-08-17)
export const OPERACIONES = ['venta', 'alquiler', 'traspaso'] as const
export type Operacion = (typeof OPERACIONES)[number]
export type EstadoPropiedad = 'disponible' | 'reservada' | 'vendida' | 'alquilada'
export type Moneda = 'USD' | 'UYU'

// Un traspaso es tomar un alquiler ya en curso: se paga mensual y se heredan
// las condiciones del contrato — por eso comparte los campos de alquiler
// (garantía, mascotas) en el formulario, la ficha y las validaciones.
export function esAlquilerOTraspaso(operacion: string): boolean {
  return operacion === 'alquiler' || operacion === 'traspaso'
}

// Público sugerido de una propiedad. La base tiene un CHECK con estos mismos
// dos valores (guardrail estructural) — si se agrega uno acá, va también en SQL.
export const IDEAL_PARA = ['familia', 'pareja'] as const

/*
  Filtros detallados pedidos por el cliente el 17/8/2026.

  El patio va aparte porque no es un sí/no: son tres estados (no tiene, abierto,
  cerrado) y el cliente quiere filtrar por el tipo.
*/
export const TIPOS_PATIO = ['abierto', 'cerrado'] as const
export type TipoPatio = (typeof TIPOS_PATIO)[number]

/*
  El resto son banderas y viven en un solo array `caracteristicas`.
  ESTA LISTA ESPEJA EL CHECK DE LA BASE (docs/sql/2026-08-17-filtros-detallados).
  Si agregás una acá, agregala también en SQL o la base va a rechazar el guardado.

  Se agrupan para pintarlas en la web y en el panel con los mismos títulos que
  usó el cliente. `garaje` NO está en la lista: es la columna `garage`, que ya
  existía desde F0 (ver la nota del SQL) y se consulta aparte.
*/
export const CARACTERISTICAS = {
  Exterior: [
    { valor: 'fondo', etiqueta: 'Fondo' },
    { valor: 'parrillero', etiqueta: 'Parrillero' },
    { valor: 'barbacoa', etiqueta: 'Barbacoa' },
  ],
  Cochera: [{ valor: 'cochera', etiqueta: 'Cochera' }],
  Comodidades: [
    { valor: 'aire_acondicionado', etiqueta: 'Aire acondicionado' },
    { valor: 'calefaccion', etiqueta: 'Calefacción' },
    { valor: 'estufa_lena', etiqueta: 'Estufa a leña' },
    { valor: 'calefon', etiqueta: 'Calefón' },
    { valor: 'placares', etiqueta: 'Placares' },
  ],
  Baño: [{ valor: 'bano_completo', etiqueta: 'Baño completo' }],
} as const

/** Todas las características válidas, aplanadas. Es lo que valida la URL. */
export const CARACTERISTICAS_VALIDAS: readonly string[] = Object.values(CARACTERISTICAS)
  .flat()
  .map((c) => c.valor)

/** La etiqueta linda de una característica, para la ficha y los chips activos. */
export function etiquetaCaracteristica(valor: string): string {
  const encontrada = Object.values(CARACTERISTICAS)
    .flat()
    .find((c) => c.valor === valor)
  return encontrada?.etiqueta ?? valor
}

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
  // alquiler (y traspaso)
  requiere_garantia: boolean | null
  tipos_garantia: string[] | null
  acepta_mascotas: boolean | null
  // en la view pública puede no venir hasta correr docs/sql/2026-08-17
  ideal_para: string[] | null
  // filtros detallados del 17/8 (docs/sql/2026-08-17-filtros-detallados)
  patio: TipoPatio | null
  caracteristicas: string[] | null
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
