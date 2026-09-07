/*
  Verifica que filtrar EN MEMORIA da exactamente lo mismo que filtraba Postgres.

  Por qué existe: hasta el 6/9/2026 cada combinación de filtros era su propia
  consulta con WHERE. Ahora se trae la lista entera una sola vez (cacheada) y se
  filtra en JS, para que los crawlers no cuesten una consulta por URL. El riesgo
  de ese cambio es sutil: que algún filtro devuelva de más o de menos y nadie se
  dé cuenta hasta que un cliente no encuentre su propiedad.

  Cómo funciona: para cada combinación le pide la home AL SITIO (o sea, al código
  de verdad, no a una copia de la lógica) y compara los códigos que muestra
  contra los que devuelve Postgres con el WHERE equivalente. Compara el ORDEN
  además del contenido: el listado sale ordenado por destacada y fecha.

  Uso:
    node scripts/verificar-filtros.mjs [url-del-sitio]
    node scripts/verificar-filtros.mjs http://localhost:3100
*/
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SITIO = (process.argv[2] ?? 'http://localhost:3100').replace(/\/+$/, '')

// Lee .env.local sin dependencias: el script se corre a mano, no en el build.
const env = Object.fromEntries(
  readFileSync(fileURLToPath(new URL('../.env.local', import.meta.url)), 'utf8')
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
  Cada caso: los filtros como los recibe la URL de la web, y los mismos filtros
  como los escribe PostgREST. El WHERE de acá es el que tenía queries.ts antes
  del cambio — es la fuente de verdad contra la que se compara.
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

/** Los códigos que muestra la web, en el orden en que aparecen. */
async function codigosDelSitio(qs) {
  const r = await fetch(`${SITIO}/${qs ? '?' + qs : ''}`)
  if (!r.ok) throw new Error(`el sitio devolvio ${r.status} para "${qs}"`)
  const html = await r.text()
  const vistos = new Set()
  for (const m of html.matchAll(/\/propiedades\/(tb-\d+)/gi)) vistos.add(m[1].toLowerCase())
  return [...vistos]
}

/** Los códigos que devuelve Postgres con el WHERE equivalente. */
async function codigosDeLaBase(where) {
  const qs = [
    'select=codigo',
    'order=destacada.desc,creado_en.desc',
    ...where,
  ].join('&')
  const r = await fetch(`${BASE}/rest/v1/propiedades_publicas?${qs}`, {
    headers: { apikey: CLAVE, Authorization: `Bearer ${CLAVE}` },
  })
  if (!r.ok) throw new Error(`la base devolvio ${r.status}: ${await r.text()}`)
  return (await r.json()).map((p) => p.codigo.toLowerCase())
}

let fallas = 0
console.log(`Comparando ${CASOS.length} combinaciones contra ${SITIO}\n`)

for (const [nombre, qs, where] of CASOS) {
  const [web, base] = await Promise.all([codigosDelSitio(qs), codigosDeLaBase(where)])
  const igual = web.length === base.length && web.every((c, i) => c === base[i])
  if (igual) {
    console.log(`  OK    ${nombre.padEnd(38)} ${base.length} propiedades`)
  } else {
    fallas++
    console.log(`  FALLA ${nombre}`)
    console.log(`        la web muestra: ${web.join(', ') || '(ninguna)'}`)
    console.log(`        la base espera: ${base.join(', ') || '(ninguna)'}`)
  }
}

console.log()
if (fallas === 0) {
  console.log(`Todo coincide: filtrar en memoria da lo mismo que el WHERE, en el mismo orden.`)
} else {
  console.log(`${fallas} de ${CASOS.length} combinaciones NO coinciden.`)
  process.exit(1)
}
