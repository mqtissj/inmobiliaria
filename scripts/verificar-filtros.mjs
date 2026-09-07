/*
  Verifica dos cosas que, si se rompen, no se notan mirando la web.

  1) QUE FILTRAR EN MEMORIA DÉ LO MISMO QUE FILTRABA POSTGRES.
     Hasta el 6/9/2026 cada combinación era su propia consulta con WHERE. Ahora
     se trae la lista entera una vez y se filtra con `filtrarPropiedades`. El
     riesgo es sutil: que un filtro devuelva de más o de menos y nadie se entere
     hasta que un cliente no encuentre su propiedad.

     Se compara la FUNCIÓN DE VERDAD (src/lib/filtros.ts, la misma que corren el
     servidor y el navegador) contra el WHERE equivalente en Postgres. Antes esto
     se hacía pidiéndole HTML al sitio; desde el 7/9 los filtros corren en el
     navegador, así que el HTML del servidor ya no refleja el filtro y había que
     cambiar el método.

  2) QUE LA HOME SIGA TRAYENDO EL LISTADO COMPLETO EN EL HTML.
     La home es estática y los filtros los aplica el navegador, así que lo que
     queda en el HTML es el listado SIN filtrar. Eso es lo que lee Google. Si
     alguien cambia el fallback del <Suspense> por un "cargando", el sitio se
     sigue viendo bien y la home se cae del índice sin aviso.
     Este chequeo corre solo si se le pasa una URL.

  Uso:
    node scripts/verificar-filtros.mjs                        (solo los filtros)
    node scripts/verificar-filtros.mjs http://localhost:3100  (además, el HTML)
    node scripts/verificar-filtros.mjs https://pfinmobiliaria.uy
*/
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const SITIO = process.argv[2]?.replace(/\/+$/, '')

// Lee .env.local sin dependencias: el script se corre a mano, no en el build.
const env = Object.fromEntries(
  readFileSync(join(RAIZ, '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)
const BASE = env.NEXT_PUBLIC_SUPABASE_URL
const CLAVE = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/*
  filtros.ts es TypeScript y Node no resuelve sus imports sin extensión, así que
  se compila con el tsc del propio proyecto a un directorio temporal. A CommonJS
  a propósito: resuelve `./types` sin extensión, cosa que ESM no hace.
  Se compila la función REAL — no una copia — que es todo el punto del script.
*/
const salida = mkdtempSync(join(tmpdir(), 'pf-filtros-'))
let filtrarPropiedades, leerFiltros
try {
  // Se invoca el tsc de node_modules con node, no `npx`: en Windows el spawn de
  // npx.cmd falla, y así tampoco depende de que tsc esté instalado global.
  execFileSync(
    process.execPath,
    [
      join(RAIZ, 'node_modules', 'typescript', 'bin', 'tsc'),
      'src/lib/filtros.ts',
      '--outDir', salida,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: RAIZ, stdio: 'pipe' }
  )
  ;({ filtrarPropiedades, leerFiltros } = createRequire(join(RAIZ, 'package.json'))(
    join(salida, 'filtros.js')
  ))
} finally {
  process.on('exit', () => rmSync(salida, { recursive: true, force: true }))
}

/*
  Cada caso: los filtros como llegan en la URL, y los mismos filtros como los
  escribe PostgREST. El WHERE de acá es el que tenía queries.ts antes del cambio
  — es la fuente de verdad contra la que se compara.
*/
const CASOS = [
  ['sin filtros', '', []],
  ['operacion venta', 'operacion=venta', ['operacion=eq.venta']],
  ['operacion alquiler', 'operacion=alquiler', ['operacion=eq.alquiler']],
  ['operacion traspaso', 'operacion=traspaso', ['operacion=eq.traspaso']],
  ['operacion invalida (no filtra)', 'operacion=cualquiera', []],
  ['tipo casa', 'tipo=casa', ['tipo=eq.casa']],
  ['tipo apartamento', 'tipo=apartamento', ['tipo=eq.apartamento']],
  ['1 dormitorio', 'dormitorios=1', ['dormitorios=eq.1']],
  ['2 dormitorios', 'dormitorios=2', ['dormitorios=eq.2']],
  ['3 dormitorios', 'dormitorios=3', ['dormitorios=eq.3']],
  ['dormitorios basura (no filtra)', 'dormitorios=abc', []],
  ['1 bano', 'banos=1', ['banos=eq.1']],
  ['2 banos', 'banos=2', ['banos=eq.2']],
  ['acepta mascotas', 'mascotas=si', ['acepta_mascotas=eq.true']],
  ['NO acepta mascotas', 'mascotas=no', ['acepta_mascotas=eq.false']],
  ['garaje', 'garaje=si', ['garage=eq.true']],
  ['patio cerrado', 'patio=cerrado', ['patio=eq.cerrado']],
  ['patio abierto', 'patio=abierto', ['patio=eq.abierto']],
  // 'techado' NO esta en TIPOS_PATIO: igual que antes del cambio, un valor que
  // no existe no filtra nada en vez de devolver cero resultados.
  ['patio inexistente (no filtra)', 'patio=techado', []],
  ['ideal familia', 'ideal=familia', ['ideal_para=cs.{familia}']],
  ['ideal pareja', 'ideal=pareja', ['ideal_para=cs.{pareja}']],
  ['caract parrillero', 'caract=parrillero', ['caracteristicas=cs.{parrillero}']],
  ['caract barbacoa', 'caract=barbacoa', ['caracteristicas=cs.{barbacoa}']],
  [
    'caract parrillero Y barbacoa (suman)',
    'caract=parrillero,barbacoa',
    ['caracteristicas=cs.{parrillero,barbacoa}'],
  ],
  ['caract inventada (no filtra)', 'caract=nada', []],
  ['venta + casa', 'operacion=venta&tipo=casa', ['operacion=eq.venta', 'tipo=eq.casa']],
  [
    'venta + casa + 2 dorm',
    'operacion=venta&tipo=casa&dormitorios=2',
    ['operacion=eq.venta', 'tipo=eq.casa', 'dormitorios=eq.2'],
  ],
  [
    'alquiler + mascotas + garaje',
    'operacion=alquiler&mascotas=si&garaje=si',
    ['operacion=eq.alquiler', 'acepta_mascotas=eq.true', 'garage=eq.true'],
  ],
  [
    'todo junto',
    'operacion=venta&tipo=casa&dormitorios=3&banos=2&garaje=si&caract=parrillero',
    [
      'operacion=eq.venta',
      'tipo=eq.casa',
      'dormitorios=eq.3',
      'banos=eq.2',
      'garage=eq.true',
      'caracteristicas=cs.{parrillero}',
    ],
  ],
]

async function pedirALaBase(where = []) {
  const qs = ['select=*', 'order=destacada.desc,creado_en.desc', ...where].join('&')
  const r = await fetch(`${BASE}/rest/v1/propiedades_publicas?${qs}`, {
    headers: { apikey: CLAVE, Authorization: `Bearer ${CLAVE}` },
  })
  if (!r.ok) throw new Error(`la base devolvio ${r.status}: ${await r.text()}`)
  return r.json()
}

const codigos = (props) => props.map((p) => p.codigo.toLowerCase())

let fallas = 0

// --- 1) equivalencia de filtros -------------------------------------------
const todas = await pedirALaBase()
console.log(`Comparando ${CASOS.length} combinaciones contra Postgres (${todas.length} propiedades)\n`)

for (const [nombre, qs, where] of CASOS) {
  const enMemoria = codigos(filtrarPropiedades(todas, leerFiltros(new URLSearchParams(qs))))
  const enLaBase = codigos(await pedirALaBase(where))
  const igual =
    enMemoria.length === enLaBase.length && enMemoria.every((c, i) => c === enLaBase[i])
  if (igual) {
    console.log(`  OK    ${nombre.padEnd(38)} ${enLaBase.length} propiedades`)
  } else {
    fallas++
    console.log(`  FALLA ${nombre}`)
    console.log(`        en memoria: ${enMemoria.join(', ') || '(ninguna)'}`)
    console.log(`        en la base: ${enLaBase.join(', ') || '(ninguna)'}`)
  }
}

// --- 2) el HTML de la home tiene que traer el listado completo -------------
if (SITIO) {
  console.log(`\nRevisando el HTML de ${SITIO} (sin ejecutar JavaScript, como un crawler)\n`)
  const html = await (await fetch(SITIO)).text()
  const enHtml = new Set([...html.matchAll(/\/propiedades\/(tb-\d+)/gi)].map((m) => m[1].toLowerCase()))
  const faltan = codigos(todas).filter((c) => !enHtml.has(c))
  if (faltan.length === 0) {
    console.log(`  OK    las ${todas.length} propiedades estan en el HTML estatico`)
  } else {
    fallas++
    console.log(`  FALLA faltan en el HTML: ${faltan.join(', ')}`)
    console.log(`        el fallback del <Suspense> en (public)/page.tsx tiene que ser`)
    console.log(`        el listado completo, no un "cargando".`)
  }
}

console.log()
if (fallas === 0) {
  console.log('Todo bien.')
} else {
  console.log(`${fallas} chequeo(s) fallaron.`)
  process.exit(1)
}
