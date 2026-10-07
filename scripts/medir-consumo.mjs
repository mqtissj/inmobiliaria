// Mide el consumo real del proyecto en Supabase y lo compara con los límites
// del plan Free. Corre con: node scripts/medir-consumo.mjs
//
// Solo LEE. No escribe ni borra nada, se puede correr cuando sea.
//
// PARA QUÉ SIRVE
// PF está en el plan Free, que tiene techos chicos. Este script contesta "¿me
// estoy acercando a alguno?" sin tener que entrar al dashboard. Correlo cada
// tanto, sobre todo después de cargar un lote grande de propiedades.
//
// LO QUE NO PUEDE MEDIR: el egress (tráfico de salida). No hay API pública que
// lo devuelva — ese número sale del dashboard, en Reports. La buena noticia es
// que las fotos públicas salen por next/image, así que Vercel baja cada
// original UNA vez y después sirve copias desde su CDN; el egress de Supabase
// no crece con las visitas. Ver minimumCacheTTL en next.config.ts.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// Límites del plan Free (supabase.com/pricing, verificados el 7/10/2026).
const LIMITES = {
  storage: 1024 * 1024 * 1024, // 1 GB
  base: 500 * 1024 * 1024, // 500 MB
  usuarios: 50_000, // MAU
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB'
const pct = (parte, total) => ((parte / total) * 100).toFixed(1) + '%'

// list() mezcla archivos y carpetas; las carpetas vienen con id null y hay que
// bajar a cada una. De ahí la recursión. El límite de 100 por página es del
// propio endpoint, así que además hay que paginar.
async function recorrer(bucket, prefijo = '') {
  const encontrados = []
  let desde = 0
  for (;;) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefijo, { limit: 100, offset: desde })
    if (error) throw new Error(`${bucket}/${prefijo}: ${error.message}`)
    if (!data.length) break
    for (const item of data) {
      const ruta = prefijo ? `${prefijo}/${item.name}` : item.name
      if (item.id === null) encontrados.push(...(await recorrer(bucket, ruta)))
      else encontrados.push({ ruta, bytes: item.metadata?.size ?? 0 })
    }
    if (data.length < 100) break
    desde += 100
  }
  return encontrados
}

// ---------- 1. Storage ----------
console.log('='.repeat(60))
console.log('STORAGE')
console.log('='.repeat(60))

const { data: buckets } = await admin.storage.listBuckets()
let totalStorage = 0
let totalArchivos = 0

for (const b of buckets ?? []) {
  const archivos = (await recorrer(b.name)).sort((x, y) => y.bytes - x.bytes)
  const bytes = archivos.reduce((a, f) => a + f.bytes, 0)
  totalStorage += bytes
  totalArchivos += archivos.length

  console.log(`\n  bucket "${b.name}" (${b.public ? 'público' : 'privado'})`)
  console.log(`    archivos: ${archivos.length}`)
  console.log(`    peso:     ${mb(bytes)}`)
  if (archivos.length) {
    console.log(`    promedio: ${mb(bytes / archivos.length)}`)
    console.log(`    el mayor: ${mb(archivos[0].bytes)}  (${archivos[0].ruta})`)
  }
}

console.log(`\n  TOTAL: ${mb(totalStorage)} de 1 GB  →  ${pct(totalStorage, LIMITES.storage)}`)
if (totalArchivos) {
  const margen = Math.floor((LIMITES.storage - totalStorage) / (totalStorage / totalArchivos))
  console.log(`  Entran unas ${margen.toLocaleString('es-UY')} fotos más al peso promedio de hoy.`)
}

// ---------- 2. Base de datos ----------
// propiedades_publicas NO va: es una view sobre propiedades, no ocupa lugar.
const TABLAS = ['propiedades', 'propiedad_fotos', 'config_negocio', 'faqs', 'intentos']

console.log('\n' + '='.repeat(60))
console.log('BASE DE DATOS')
console.log('='.repeat(60) + '\n')

let bytesContenido = 0
for (const t of TABLAS) {
  const { count, error } = await admin.from(t).select('*', { count: 'exact', head: true })
  if (error) {
    console.log(`  ${t.padEnd(18)} ERROR: ${error.message}`)
    continue
  }
  const { data } = await admin.from(t).select('*')
  const bytes = data ? Buffer.byteLength(JSON.stringify(data)) : 0
  bytesContenido += bytes
  console.log(`  ${t.padEnd(18)} ${String(count).padStart(5)} filas   ${mb(bytes)}`)
}

console.log(`\n  Contenido total: ${mb(bytesContenido)} de 500 MB`)
console.log('  OJO: el dashboard va a mostrar bastante más. El tamaño que cuenta')
console.log('  Supabase incluye el piso de todo proyecto (schemas de auth, de')
console.log('  storage, extensiones, índices): son decenas de MB que ya están')
console.log('  ocupados antes de cargar la primera propiedad.')

// ---------- 3. Usuarios ----------
console.log('\n' + '='.repeat(60))
console.log('USUARIOS (Auth)')
console.log('='.repeat(60) + '\n')

const { data: usuarios } = await admin.auth.admin.listUsers({ perPage: 1000 })
const lista = usuarios?.users ?? []
console.log(`  ${lista.length} de 50.000 MAU  →  ${pct(lista.length, LIMITES.usuarios)}\n`)
for (const u of lista) {
  console.log(`    ${u.email}  |  último login: ${u.last_sign_in_at?.slice(0, 10) ?? 'nunca'}`)
}

// ---------- 4. Lo que el script no ve ----------
console.log('\n' + '='.repeat(60))
console.log('REVISAR A MANO EN EL DASHBOARD (Reports)')
console.log('='.repeat(60))
console.log(`
  - Egress: 5 GB/mes en Free. No hay API para leerlo.
  - Que el proyecto no esté pausado: Free se pausa tras 1 SEMANA sin
    actividad. El ping de UptimeRobot es lo que lo mantiene vivo.
`)
