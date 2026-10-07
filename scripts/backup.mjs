// Backup completo a disco — datos y fotos. Corre con: node scripts/backup.mjs
//
// Solo LEE de Supabase. Lo único que escribe es la carpeta backups/ local.
//
// POR QUÉ EXISTE
// El plan Free de Supabase NO tiene backups automáticos (Pro trae 7 días). Si
// alguien borra una propiedad por error, o se cae el proyecto, no hay botón de
// "volver atrás": lo único que queda es lo que haya en disco. Esto es ese disco.
//
// CADA CUÁNTO
// Después de cargar propiedades nuevas, y si no, una vez por mes. Son 15 MB,
// no hay razón para espaciarlo más. Guardá alguna copia FUERA de la máquina
// (Drive, un pendrive) — un backup que vive solo en la notebook que se puede
// romper no es un backup.
//
// Cada corrida crea una carpeta nueva con la fecha; no pisa las anteriores.
// Borralas vos a mano cuando sobren.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const BUCKET = 'fotos-propiedades'
// propiedades_publicas no va: es una view sobre propiedades, se regenera sola.
// intentos tampoco: es el rate-limit de contacto, estado efímero que no sirve restaurar.
const TABLAS = ['propiedades', 'propiedad_fotos', 'config_negocio', 'faqs']

// Nombre de carpeta ordenable alfabéticamente: 2026-10-07-1530
const ahora = new Date()
const sello = [
  ahora.getFullYear(),
  String(ahora.getMonth() + 1).padStart(2, '0'),
  String(ahora.getDate()).padStart(2, '0'),
].join('-') + '-' + String(ahora.getHours()).padStart(2, '0') + String(ahora.getMinutes()).padStart(2, '0')

const RAIZ = fileURLToPath(new URL('../backups', import.meta.url))
const DESTINO = join(RAIZ, sello)
mkdirSync(DESTINO, { recursive: true })

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB'

console.log(`Backup → backups/${sello}\n`)

// ---------- 1. Tablas ----------
// PostgREST devuelve 1000 filas como máximo por pedido. Hoy sobra, pero si el
// catálogo crece esto sigue funcionando sin que nadie se acuerde de tocarlo.
async function traerTodo(tabla) {
  const filas = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await admin.from(tabla).select('*').range(desde, desde + 999)
    if (error) throw new Error(`${tabla}: ${error.message}`)
    filas.push(...data)
    if (data.length < 1000) return filas
  }
}

const datos = {}
for (const t of TABLAS) {
  datos[t] = await traerTodo(t)
  console.log(`  ${t.padEnd(18)} ${String(datos[t].length).padStart(5)} filas`)
}

// Los usuarios van como REFERENCIA, no como backup: las contraseñas están
// hasheadas del lado de Supabase y no se pueden exportar ni restaurar. Si hay
// que rehacer el proyecto, estos usuarios se crean de nuevo y cada uno usa
// "olvidé mi contraseña".
const { data: auth } = await admin.auth.admin.listUsers({ perPage: 1000 })
datos._usuarios_referencia = (auth?.users ?? []).map((u) => ({
  email: u.email,
  creado: u.created_at,
  ultimo_login: u.last_sign_in_at,
}))

writeFileSync(join(DESTINO, 'datos.json'), JSON.stringify(datos, null, 2))
console.log(`  ${'usuarios (ref)'.padEnd(18)} ${String(datos._usuarios_referencia.length).padStart(5)}\n`)

// ---------- 2. Fotos ----------
async function recorrer(prefijo = '') {
  const encontrados = []
  let desde = 0
  for (;;) {
    const { data, error } = await admin.storage
      .from(BUCKET)
      .list(prefijo, { limit: 100, offset: desde })
    if (error) throw new Error(`${BUCKET}/${prefijo}: ${error.message}`)
    if (!data.length) break
    for (const item of data) {
      const ruta = prefijo ? `${prefijo}/${item.name}` : item.name
      if (item.id === null) encontrados.push(...(await recorrer(ruta)))
      else encontrados.push({ ruta, bytes: item.metadata?.size ?? 0 })
    }
    if (data.length < 100) break
    desde += 100
  }
  return encontrados
}

const archivos = await recorrer()
console.log(`  Bajando ${archivos.length} fotos (${mb(archivos.reduce((a, f) => a + f.bytes, 0))})...`)

let bajadas = 0
let fallaron = []

// De a 8 en paralelo: con 126 archivos la diferencia contra hacerlo de a uno
// es de un minuto a unos segundos, y 8 no llega a molestar al endpoint.
for (let i = 0; i < archivos.length; i += 8) {
  await Promise.all(
    archivos.slice(i, i + 8).map(async ({ ruta }) => {
      const { data, error } = await admin.storage.from(BUCKET).download(ruta)
      if (error || !data) {
        fallaron.push(`${ruta}: ${error?.message ?? 'sin datos'}`)
        return
      }
      const salida = join(DESTINO, 'fotos', ruta)
      mkdirSync(dirname(salida), { recursive: true })
      writeFileSync(salida, Buffer.from(await data.arrayBuffer()))
      bajadas++
    })
  )
  process.stdout.write(`\r  ${bajadas}/${archivos.length}`)
}
console.log()

// ---------- 3. Chequeo de integridad ----------
// Que la cantidad coincida no alcanza: hay que ver que cada foto REFERENCIADA
// en la base exista de verdad en el bucket. Al revés (archivos sin fila) es
// basura que quedó de borrados a medias — molesta menos, pero conviene saberlo.
const prefijoPublico = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`
const enLaBase = new Set(
  datos.propiedad_fotos.map((f) => decodeURIComponent(f.url.replace(prefijoPublico, '')))
)
const enElBucket = new Set(archivos.map((a) => a.ruta))

const faltantes = [...enLaBase].filter((r) => !enElBucket.has(r))
const huerfanos = [...enElBucket].filter((r) => !enLaBase.has(r))

console.log('\n' + '-'.repeat(52))
if (fallaron.length) {
  console.log(`  ${fallaron.length} fotos NO se pudieron bajar:`)
  fallaron.forEach((f) => console.log(`    ${f}`))
}
if (faltantes.length) {
  console.log(`  ${faltantes.length} fotos están en la base pero NO en el bucket`)
  console.log('    (son las que en el sitio se ven rotas):')
  faltantes.forEach((r) => console.log(`    ${r}`))
}
if (huerfanos.length) {
  console.log(`  ${huerfanos.length} archivos en el bucket sin fila en la base`)
  console.log('    (ocupan lugar al pepe, se pueden borrar):')
  huerfanos.forEach((r) => console.log(`    ${r}`))
}
if (!fallaron.length && !faltantes.length && !huerfanos.length) {
  console.log('  Base y bucket coinciden exactamente.')
}
console.log('-'.repeat(52))

// ---------- 4. Instrucciones de restauración ----------
// Van ADENTRO del backup a propósito: el día que haga falta, puede que no esté
// ni el repo ni la persona que lo armó.
writeFileSync(
  join(DESTINO, 'LEEME.md'),
  `# Backup de PF Negocios Inmobiliarios

Tomado el ${ahora.toLocaleString('es-UY')}.

| | |
|---|---|
${TABLAS.map((t) => `| ${t} | ${datos[t].length} filas |`).join('\n')}
| fotos | ${bajadas} archivos |

## Qué hay acá

- \`datos.json\` — todas las tablas. La clave \`_usuarios_referencia\` es
  informativa: las contraseñas NO se pueden exportar.
- \`fotos/\` — los archivos del bucket \`${BUCKET}\`, con la misma estructura
  de carpetas que allá (una carpeta por código de propiedad).

## Cómo restaurar

1. **Las fotos primero.** En el dashboard de Supabase → Storage → bucket
   \`${BUCKET}\` → Upload, respetando las carpetas tal cual están acá. Si no
   existe el bucket, \`node scripts/setup-dev.mjs\` lo crea con la config correcta.

2. **Después los datos.** Con \`propiedades\` antes que \`propiedad_fotos\`
   (la segunda apunta a la primera por \`propiedad_id\`, y si no está la
   propiedad el insert se rechaza).

3. **Los usuarios del panel** se crean a mano en Authentication → Add user, y
   cada uno entra con "olvidé mi contraseña".

## OJO si el proyecto de Supabase es OTRO

La columna \`propiedad_fotos.url\` guarda la URL completa, con el identificador
del proyecto adentro:

\`\`\`
${prefijoPublico}<codigo>/<archivo>.jpeg
\`\`\`

Si restaurás en el MISMO proyecto, no tocás nada. Si restaurás en uno nuevo,
hay que reemplazar \`${env.NEXT_PUBLIC_SUPABASE_URL}\` por la URL nueva en todas
esas filas, o las fotos van a quedar rotas en el sitio.
`
)

console.log(`\nListo: backups/${sello}`)
console.log('Subí una copia a Drive o a un pendrive — en la notebook sola no es backup.')
