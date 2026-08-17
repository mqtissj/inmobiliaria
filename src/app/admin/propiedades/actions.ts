'use server'

// Actions del panel: crear, actualizar y eliminar propiedades, y manejar fotos.
// Compartidas por el alta (/nueva) y la edición (/[codigo]).
//
// Regla de todas: los ARCHIVOS nunca pasan por acá (límite de 1 MB por request
// en Server Actions de Next 16) — suben/bajan directo del navegador al bucket
// con la sesión del usuario. Acá viajan datos y URLs, y toda action re-verifica
// la sesión: son endpoints POST públicos aunque el form esté detrás del login.
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import {
  CARACTERISTICAS_VALIDAS,
  esAlquilerOTraspaso,
  esRural,
  IDEAL_PARA,
  OPERACIONES,
  TIPOS_PATIO,
  TIPOS_PROPIEDAD,
} from '@/lib/types'

export interface EstadoGuardar {
  error: string | null
  ok?: { id: string; codigo: string }
  /*
    React 19 RESETEA el <form> en cada envío: pide el reset ANTES de correr la
    action y lo aplica cuando la transición termina, haya salido bien o mal
    (react-dom lo hace sin condición). Como casi todos los campos de acá son no
    controlados —usan defaultValue/defaultChecked—, eso significa que cualquier
    error de validación borra todo lo cargado; y en la EDICIÓN los devuelve a los
    valores guardados en la base, que es exactamente lo que se siente como
    "no me deja editar".

    Por eso, cuando algo falla devolvemos lo que el usuario había mandado
    (`valores`) más un contador (`intento`) que el formulario usa como `key`
    para remontarse con esos valores como nuevos defaults.
  */
  intento?: number
  valores?: ValoresEnviados
}

export interface ValoresEnviados {
  /** Inputs, selects y textareas. Los checkboxes tildados llegan como 'on'. */
  simples: Record<string, string>
  /** Campos que se repiten: varios checkboxes comparten el mismo `name`. */
  listas: Record<string, string[]>
}

// Estos van con getAll, no con get: si se leen con get se pierde todo menos uno.
const CAMPOS_LISTA = ['tipos_garantia', 'ideal_para', 'caracteristicas'] as const
// Hidden que arma el propio formulario; repoblarlos no tendría sentido.
const CAMPOS_INTERNOS = new Set(['id', 'codigo_anterior'])

function valoresEnviados(formData: FormData): ValoresEnviados {
  const simples: Record<string, string> = {}
  for (const [clave, valor] of formData.entries()) {
    // Next agrega campos propios que empiezan con $ (el identificador de la action)
    if (clave.startsWith('$') || CAMPOS_INTERNOS.has(clave)) continue
    if ((CAMPOS_LISTA as readonly string[]).includes(clave)) continue
    if (typeof valor === 'string') simples[clave] = valor
  }
  const listas: Record<string, string[]> = {}
  for (const clave of CAMPOS_LISTA) listas[clave] = formData.getAll(clave).map(String)
  return { simples, listas }
}

// TODA salida con error pasa por acá: así nunca se pierde lo que se había cargado.
function fallo(mensaje: string, previo: EstadoGuardar, formData: FormData): EstadoGuardar {
  return {
    error: mensaje,
    intento: (previo.intento ?? 0) + 1,
    valores: valoresEnviados(formData),
  }
}

// Traduce un error de Postgres a algo que el dueño de la inmobiliaria entienda,
// y deja el error completo en los logs del servidor (Vercel) para poder mirarlo.
function mensajeDeBase(error: { code?: string; message: string }, donde: string): string {
  console.error(`[${donde}] error de Supabase:`, error)
  if (error.code === '23514')
    return 'Algún dato no cumple una regla de la base. Revisá los campos marcados y probá de nuevo.'
  if (error.code === '42501')
    return 'Tu usuario no tiene permiso para esta operación. Cerrá sesión, volvé a entrar y probá otra vez.'
  return 'No se pudo guardar. Esperá unos segundos y volvé a intentar — lo que cargaste sigue acá.'
}

/*
  Números escritos como se escriben en Uruguay.
  El punto separa miles y la coma decimales: "1.350.000" son un millón trescientos
  cincuenta mil, y "120,5" son ciento veinte y medio.
  Antes esto era Number(s.replace(',', '.')), que además de romper con "1.350.000"
  (NaN) hacía algo peor y silencioso: "135.000" se guardaba como 135.
  null si vino vacío; NaN si vino mal escrito (para avisar, no para adivinar).
*/
function numero(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? '').trim()
  if (s === '') return null
  let limpio: string
  if (s.includes(',')) {
    // Hay coma: los puntos son separadores de miles ("1.350.000,50")
    limpio = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // Sin coma, pero con puntos cada 3 dígitos: son miles ("135.000")
    limpio = s.replace(/\./g, '')
  } else {
    // Un punto suelto que no forma miles se respeta como decimal ("120.5")
    limpio = s
  }
  return Number(limpio)
}

// Validación + armado de la fila. La comparten crear y actualizar para que
// las reglas sean UNA sola vez (si divergen, aparecen bugs de "en el alta sí,
// en la edición no").
function armarFila(formData: FormData): { error: string } | { fila: Record<string, unknown>; codigo: string } {
  const codigo = String(formData.get('codigo') ?? '').trim().toUpperCase()
  const titulo = String(formData.get('titulo') ?? '').trim()
  const operacion = String(formData.get('operacion') ?? '')
  const tipo = String(formData.get('tipo') ?? '')
  const estado = String(formData.get('estado') ?? 'disponible')
  const moneda = String(formData.get('moneda') ?? 'USD')

  if (!codigo || !titulo) return { error: 'El código y el título son obligatorios.' }
  if (!/^[A-Z0-9-]{2,20}$/.test(codigo))
    return { error: 'El código lleva solo letras, números y guiones (ej.: TB-005).' }
  if (!(OPERACIONES as readonly string[]).includes(operacion)) return { error: 'Elegí la operación.' }
  if (!(TIPOS_PROPIEDAD as readonly string[]).includes(tipo)) return { error: 'Elegí el tipo de propiedad.' }
  if (!['disponible', 'reservada', 'vendida', 'alquilada'].includes(estado))
    return { error: 'El estado no es válido.' }
  if (!['USD', 'UYU'].includes(moneda)) return { error: 'La moneda es USD o UYU — nunca se convierte.' }

  const numericos = {
    precio: numero(formData.get('precio')),
    gastos_comunes: numero(formData.get('gastos_comunes')),
    dormitorios: numero(formData.get('dormitorios')),
    banos: numero(formData.get('banos')),
    m2_edificados: numero(formData.get('m2_edificados')),
    m2_terreno: numero(formData.get('m2_terreno')),
    plantas: numero(formData.get('plantas')),
    hectareas: numero(formData.get('hectareas')),
    indice_coneat: numero(formData.get('indice_coneat')),
  }
  const malEscritos = Object.entries(numericos).filter(([, v]) => v !== null && Number.isNaN(v))
  if (malEscritos.length > 0)
    return {
      error: `Revisá estos campos: ${malEscritos.map(([k]) => k.replace('_', ' ')).join(', ')}. Van solo números (la coma decimal sí vale).`,
    }

  const tiposGarantia = formData.getAll('tipos_garantia').map(String)
  // Solo los valores del CHECK de la base; cualquier otro se descarta acá
  // en vez de reventar como error de constraint incomprensible para el usuario
  const idealPara = formData
    .getAll('ideal_para')
    .map(String)
    .filter((v) => (IDEAL_PARA as readonly string[]).includes(v))
  // Filtros detallados del 17/8. Se validan contra el mismo vocabulario que
  // tiene el CHECK de la base: así un valor raro se descarta acá con un
  // mensaje entendible, en vez de reventar como error de constraint.
  const caracteristicas = formData
    .getAll('caracteristicas')
    .map(String)
    .filter((v) => CARACTERISTICAS_VALIDAS.includes(v))
  const patioElegido = String(formData.get('patio') ?? '')
  const patio = (TIPOS_PATIO as readonly string[]).includes(patioElegido) ? patioElegido : null
  // Un traspaso ES un alquiler en curso: hereda garantía y mascotas
  const conCondicionesDeAlquiler = esAlquilerOTraspaso(operacion)
  // Los campos y chacras no llevan datos de construcción (CLAUDE.md §5)
  const conDatosUrbanos = !esRural(tipo)

  return {
    codigo,
    fila: {
      codigo,
      titulo,
      descripcion: String(formData.get('descripcion') ?? '').trim() || null,
      operacion,
      tipo,
      estado,
      departamento: 'Tacuarembó',
      ciudad: String(formData.get('ciudad') ?? '').trim() || 'Tacuarembó',
      barrio: String(formData.get('barrio') ?? '').trim() || null,
      direccion: String(formData.get('direccion') ?? '').trim() || null,
      mostrar_direccion: formData.get('mostrar_direccion') === 'on',
      ...numericos,
      moneda,
      precio_publico: formData.get('precio_publico') === 'on',
      garage: formData.get('garage') === 'on' ? true : null,
      tiene_agua: formData.get('tiene_agua') === 'on' ? true : null,
      tiene_luz: formData.get('tiene_luz') === 'on' ? true : null,
      alambrado: formData.get('alambrado') === 'on' ? true : null,
      padron: String(formData.get('padron') ?? '').trim() || null,
      requiere_garantia: conCondicionesDeAlquiler ? formData.get('requiere_garantia') === 'on' : null,
      tipos_garantia: conCondicionesDeAlquiler && tiposGarantia.length > 0 ? tiposGarantia : null,
      acepta_mascotas: conCondicionesDeAlquiler ? formData.get('acepta_mascotas') === 'on' : null,
      ideal_para: idealPara.length > 0 ? idealPara : null,
      // Un campo o una chacra no tienen patio ni parrillero: los datos urbanos
      // no se guardan en propiedades rurales, igual que dormitorios o m².
      patio: conDatosUrbanos ? patio : null,
      caracteristicas: conDatosUrbanos && caracteristicas.length > 0 ? caracteristicas : null,
      destacada: formData.get('destacada') === 'on',
    },
  }
}

async function usuarioActual() {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function crearPropiedad(previo: EstadoGuardar, formData: FormData): Promise<EstadoGuardar> {
  const { supabase, user } = await usuarioActual()
  if (!user) return fallo('Tu sesión venció. Recargá la página y entrá de nuevo.', previo, formData)

  const res = armarFila(formData)
  if ('error' in res) return fallo(res.error, previo, formData)

  const { data, error } = await supabase.from('propiedades').insert(res.fila).select('id, codigo').single()

  if (error) {
    if (error.code === '23505')
      return fallo(`Ya existe una propiedad con el código ${res.codigo}. Usá otro.`, previo, formData)
    return fallo(mensajeDeBase(error, 'crearPropiedad'), previo, formData)
  }

  revalidatePath('/')
  revalidatePath(`/propiedades/${res.codigo.toLowerCase()}`)
  return { error: null, ok: { id: data.id, codigo: data.codigo } }
}

export async function actualizarPropiedad(previo: EstadoGuardar, formData: FormData): Promise<EstadoGuardar> {
  const { supabase, user } = await usuarioActual()
  if (!user) return fallo('Tu sesión venció. Recargá la página y entrá de nuevo.', previo, formData)

  const id = String(formData.get('id') ?? '')
  if (!id) return fallo('Falta el identificador de la propiedad. Recargá la página.', previo, formData)

  // El código viejo, para revalidar también la URL anterior si cambió
  const codigoAnterior = String(formData.get('codigo_anterior') ?? '')

  const res = armarFila(formData)
  if ('error' in res) return fallo(res.error, previo, formData)

  const { data, error } = await supabase
    .from('propiedades')
    .update(res.fila)
    .eq('id', id)
    .select('id, codigo')
    .single()

  if (error) {
    if (error.code === '23505')
      return fallo(`Ya existe otra propiedad con el código ${res.codigo}.`, previo, formData)
    return fallo(mensajeDeBase(error, 'actualizarPropiedad'), previo, formData)
  }

  revalidatePath('/')
  revalidatePath(`/propiedades/${res.codigo.toLowerCase()}`)
  if (codigoAnterior && codigoAnterior !== res.codigo) {
    revalidatePath(`/propiedades/${codigoAnterior.toLowerCase()}`)
  }
  return { error: null, ok: { id: data.id, codigo: data.codigo } }
}

// La URL pública de un archivo del bucket → su ruta interna, para poder borrarlo
function rutaEnBucket(url: string): string | null {
  const marca = '/storage/v1/object/public/fotos-propiedades/'
  const i = url.indexOf(marca)
  return i === -1 ? null : decodeURIComponent(url.slice(i + marca.length))
}

export async function eliminarPropiedad(formData: FormData): Promise<void> {
  const { supabase, user } = await usuarioActual()
  if (!user) redirect('/login')

  const id = String(formData.get('id') ?? '')
  const codigo = String(formData.get('codigo') ?? '')
  if (!id) redirect('/admin')

  // Primero los archivos del bucket. El resultado SE VERIFICA: aprendimos que
  // remove() puede "funcionar" devolviendo 0 borrados (p. ej. si falta una
  // política) — y un fallo silencioso acá deja archivos huérfanos ocupando lugar.
  const { data: fotos } = await supabase.from('propiedad_fotos').select('url').eq('propiedad_id', id)
  const rutas = (fotos ?? []).map((f) => rutaEnBucket(f.url)).filter((r): r is string => r !== null)
  let archivosHuerfanos = false
  if (rutas.length > 0) {
    const { data: borrados, error: errStorage } = await supabase.storage
      .from('fotos-propiedades')
      .remove(rutas)
    archivosHuerfanos = !!errStorage || (borrados?.length ?? 0) < rutas.length
  }

  await supabase.from('propiedad_fotos').delete().eq('propiedad_id', id)
  const { error } = await supabase.from('propiedades').delete().eq('id', id)
  if (error) redirect(`/admin?error=borrar&codigo=${encodeURIComponent(codigo)}`)

  revalidatePath('/')
  if (codigo) revalidatePath(`/propiedades/${codigo.toLowerCase()}`)
  // La propiedad sale de la web igual; si quedó basura en el bucket, se avisa.
  redirect(
    `/admin?borrada=${encodeURIComponent(codigo)}${archivosHuerfanos ? '&fotos=huerfanas' : ''}`
  )
}

// Se llama DESPUÉS de que el navegador subió archivos nuevos al bucket.
export async function registrarFotos(
  propiedadId: string,
  codigo: string,
  fotos: { url: string; orden: number; es_portada: boolean }[]
): Promise<{ error: string | null }> {
  const { supabase, user } = await usuarioActual()
  if (!user) return { error: 'Tu sesión venció. Las fotos quedaron subidas pero sin registrar.' }

  if (fotos.length === 0) return { error: null }

  const { error } = await supabase
    .from('propiedad_fotos')
    .insert(fotos.map((f) => ({ ...f, propiedad_id: propiedadId })))

  if (error) return { error: 'Las fotos subieron pero no se pudieron vincular a la propiedad.' }

  revalidatePath('/')
  revalidatePath(`/propiedades/${codigo.toLowerCase()}`)
  return { error: null }
}

// Borra UNA foto existente (fila + archivo). Se usa desde la edición.
export async function borrarFoto(fotoId: string, codigo: string): Promise<{ error: string | null }> {
  const { supabase, user } = await usuarioActual()
  if (!user) return { error: 'Tu sesión venció. Recargá la página y entrá de nuevo.' }

  const { data: foto } = await supabase.from('propiedad_fotos').select('url').eq('id', fotoId).single()
  if (!foto) return { error: 'Esa foto ya no existe.' }

  const ruta = rutaEnBucket(foto.url)
  if (ruta) {
    const { error: errStorage } = await supabase.storage.from('fotos-propiedades').remove([ruta])
    // Si el archivo no se pudo borrar, NO sacamos la fila: mejor que la foto
    // siga visible a que quede un archivo huérfano invisible en el bucket.
    if (errStorage) return { error: 'No se pudo borrar el archivo de la foto. Probá de nuevo.' }
  }

  const { error } = await supabase.from('propiedad_fotos').delete().eq('id', fotoId)
  if (error) return { error: 'No se pudo borrar la foto. Probá de nuevo.' }

  revalidatePath('/')
  revalidatePath(`/propiedades/${codigo.toLowerCase()}`)
  return { error: null }
}
