// Verificación del guardrail y las políticas — corre con: node scripts/verify-setup.mjs
// Simula los tres roles reales: un atacante con la anon key, la web pública,
// y un usuario logueado del panel. Cada check imprime PASA o FALLA.
// Si algo FALLA acá, no se entrega: es la batería de seguridad del sistema.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL
const anon = createClient(URL_SB, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const admin = createClient(URL_SB, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let fallas = 0
function check(nombre, ok, detalle = '') {
  console.log(`${ok ? 'PASA ' : 'FALLA'}  ${nombre}${detalle ? ` — ${detalle}` : ''}`)
  if (!ok) fallas++
}

/*
  Caso de prueba del guardrail del precio, creado y borrado por esta misma
  batería.

  ANTES dependía de que existiera la propiedad TB-004 (CLAUDE.md §4.2). El
  18/8/2026 esa fila se borró al limpiar datos de prueba, y con ella quedó SIN
  VERIFICAR el guardrail más importante del sistema — el listado real pasó a
  tener "0 en consultar". La batería falló, que es lo correcto, pero el
  problema es que el chequeo dependía de que alguien no tocara una fila.

  Ahora la batería se fabrica su propio caso: una propiedad con el precio
  cargado pero NO publicado, y sin mostrar la dirección. Se borra al terminar.
  Ventajas: no depende de datos que el cliente puede editar, y no deja una
  propiedad falsa visible en la web de una inmobiliaria real y en producción.
*/
const CODIGO_PRUEBA = 'ZZGUARDRAIL'
const PRECIO_SECRETO = 350000
await admin.from('propiedades').delete().eq('codigo', CODIGO_PRUEBA) // por si quedó de una corrida cortada
const { error: errSemilla } = await admin.from('propiedades').insert({
  codigo: CODIGO_PRUEBA,
  titulo: 'Verificación del guardrail — se borra sola',
  operacion: 'venta',
  tipo: 'campo',
  estado: 'disponible', // tiene que estar en la view para poder probarla
  departamento: 'Tacuarembó',
  ciudad: 'Tacuarembó',
  moneda: 'USD',
  precio: PRECIO_SECRETO,
  precio_publico: false,   // el dato que NO puede salir
  mostrar_direccion: false, // el padrón tampoco
  padron: '99999',
})
if (errSemilla) {
  console.log(`FALLA  no se pudo crear el caso de prueba del guardrail — ${errSemilla.message}`)
  process.exit(1)
}

// ---------- 1. Atacante con anon key ----------
{
  const { error } = await anon.from('propiedades').select('precio').eq('codigo', CODIGO_PRUEBA)
  check('anon NO puede leer la tabla propiedades directo', !!error, error?.message ?? 'pudo leerla!')
}
{
  const { data } = await anon.from('propiedades_publicas').select('precio, padron, direccion').eq('codigo', CODIGO_PRUEBA).single()
  check(`view: el precio oculto llega null aunque en la tabla vale ${PRECIO_SECRETO}`, data != null && data.precio === null)
  check('view: padrón oculto cuando mostrar_direccion=false', data != null && data.padron === null)
  check('view: dirección oculta cuando mostrar_direccion=false', data != null && data.direccion === null)
}
{
  const { error } = await anon.from('propiedades').insert({ codigo: 'HACK-1', titulo: 'x', operacion: 'venta', tipo: 'casa' })
  check('anon NO puede insertar propiedades', !!error)
}
{
  const { error } = await anon.storage.from('fotos-propiedades').upload('hack/x.png', new Uint8Array([137, 80, 78, 71]), { contentType: 'image/png' })
  check('anon NO puede subir archivos al bucket', !!error)
}

// ---------- 2. La web pública ----------
{
  const { data, error } = await anon.from('propiedades_publicas').select('codigo, precio')
  check('la web lee el listado por la view', !error && (data?.length ?? 0) > 0, `${data?.length ?? 0} propiedades`)
  const conPrecio = data?.filter((p) => p.precio != null).length ?? 0
  console.log(`       (${conPrecio} con precio visible, ${(data?.length ?? 0) - conPrecio} en "consultar")`)
}
{
  const { data } = await anon.from('config_negocio').select('clave')
  check('la web lee config_negocio (header/footer)', (data?.length ?? 0) >= 6)
}
// Del 17/8 (docs/sql/2026-08-17): si esto falla, falta correr ese SQL.
{
  const { error } = await anon.from('propiedades_publicas').select('codigo').eq('operacion', 'traspaso').limit(1)
  check("el enum acepta 'traspaso' (filtro de la web)", !error, error?.message)
}
{
  const { error } = await anon.from('propiedades_publicas').select('ideal_para').limit(1)
  check('la view expone ideal_para (filtro familia/pareja)', !error, error?.message)
}

// ---------- 3. Usuario del panel (authenticated) ----------
{
  // Credenciales desde .env.local, nunca escritas en el codigo: este repo es
  // publico (ver la nota de setup-dev.mjs).
  if (!env.PANEL_TEST_EMAIL || !env.PANEL_TEST_PASSWORD) {
    console.log('FALLA  faltan PANEL_TEST_EMAIL / PANEL_TEST_PASSWORD en .env.local')
    process.exit(1)
  }
  const { data: sesion, error: errLogin } = await anon.auth.signInWithPassword({
    email: env.PANEL_TEST_EMAIL,
    password: env.PANEL_TEST_PASSWORD,
  })
  check('login con contraseña funciona', !errLogin && !!sesion?.session)

  if (sesion?.session) {
    const auth = createClient(URL_SB, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${sesion.session.access_token}` } },
      auth: { persistSession: false },
    })

    const { data: todas, error: errSel } = await auth.from('propiedades').select('codigo, precio').order('codigo')
    check('panel lee la tabla completa (todas las filas)', !errSel && (todas?.length ?? 0) >= 4)
    const prueba = todas?.find((p) => p.codigo === CODIGO_PRUEBA)
    check(`panel SÍ ve el precio real oculto (${PRECIO_SECRETO})`, prueba?.precio === PRECIO_SECRETO)

    const { error: errIns } = await auth.from('propiedades').insert({
      codigo: 'ZZVERIFY-1', titulo: 'fila de verificación — borrar', operacion: 'venta', tipo: 'casa',
      estado: 'disponible', moneda: 'USD', precio_publico: false, departamento: 'Tacuarembó', ciudad: 'Tacuarembó',
    })
    check('panel puede insertar propiedades', !errIns, errIns?.message)

    // delete primero: si una corrida anterior se corto antes de limpiar, el
    // upload fallaria con "The resource already exists" y el check acusaria un
    // problema de permisos que no existe. La bateria tiene que poder correrse
    // dos veces seguidas y dar lo mismo.
    await auth.storage.from('fotos-propiedades').remove(['zzverify/test.png'])
    const { error: errFotoUp } = await auth.storage
      .from('fotos-propiedades')
      .upload('zzverify/test.png', new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), { contentType: 'image/png' })
    check('panel puede subir al bucket de fotos', !errFotoUp, errFotoUp?.message)

    // Borrar en Storage necesita DELETE **y** SELECT sobre storage.objects.
    // Sin el SELECT, remove() devuelve 0 borrados SIN error (bug real que esta
    // batería encontró el 13/8) — por eso acá se cuenta lo borrado, no el error.
    const { data: borrados, error: errFotoDel } = await auth.storage
      .from('fotos-propiedades')
      .remove(['zzverify/test.png'])
    check(
      'panel puede BORRAR del bucket (y borra de verdad)',
      !errFotoDel && (borrados?.length ?? 0) === 1,
      errFotoDel?.message ?? `borrados: ${borrados?.length ?? 0} de 1`
    )

    // limpieza de lo que creó el test
    await auth.from('propiedades').delete().eq('codigo', 'ZZVERIFY-1')
    // scope local: si no, este signOut revoca TODAS las sesiones del usuario
    // (incluida la del navegador de quien esté usando el panel en ese momento)
    await anon.auth.signOut({ scope: 'local' })
  }
}

// ---------- 4. Límite de intentos (docs/sql/2026-08-17-rate-limit.sql) ----------
// Si esto falla, falta correr ese SQL en el SQL Editor.
{
  // Clave única por corrida: el test no puede pisar contadores reales
  const clave = [`verify:${Date.now()}`]

  const primera = await admin.rpc('registrar_intento', {
    p_claves: clave,
    p_limite: 2,
    p_ventana_minutos: 15,
  })
  check(
    'existe la función registrar_intento',
    !primera.error,
    primera.error?.message ?? ''
  )

  if (!primera.error) {
    const fila = (d) => (Array.isArray(d) ? d[0] : d)
    check('primer intento permitido', fila(primera.data)?.permitido === true)

    await admin.rpc('registrar_intento', { p_claves: clave, p_limite: 2, p_ventana_minutos: 15 })
    const tercera = await admin.rpc('registrar_intento', {
      p_claves: clave,
      p_limite: 2,
      p_ventana_minutos: 15,
    })
    const f3 = fila(tercera.data)
    check(
      'al pasarse del límite corta y dice cuánto esperar',
      f3?.permitido === false && Number(f3?.espera_segundos) > 0,
      `permitido=${f3?.permitido}, espera=${f3?.espera_segundos}s`
    )

    await admin.rpc('limpiar_intentos', { p_claves: clave })
    const despues = await admin.rpc('registrar_intento', {
      p_claves: clave,
      p_limite: 2,
      p_ventana_minutos: 15,
    })
    check('limpiar_intentos libera el contador', fila(despues.data)?.permitido === true)
    await admin.rpc('limpiar_intentos', { p_claves: clave })

    // Estos van ADENTRO del if a propósito: si la función no existe, "anon no
    // puede llamarla" pasaría por el motivo equivocado y taparía el problema.
    // Lo que importa acá es que exista Y que el público no la alcance: si
    // pudiera, llenaría el contador de la IP del cliente y lo dejaría afuera
    // de su propio panel.
    const { error: errRpcAnon } = await anon.rpc('registrar_intento', {
      p_claves: ['hack'],
      p_limite: 1,
      p_ventana_minutos: 15,
    })
    check('anon NO puede llamar a registrar_intento', !!errRpcAnon, errRpcAnon?.message ?? '¡pudo!')

    const { error: errTablaAnon } = await anon.from('intentos').select('id').limit(1)
    check('anon NO puede leer la tabla intentos', !!errTablaAnon, errTablaAnon?.message ?? '¡pudo!')

    // La tabla NO puede tener datos personales: ni mails ni IPs en claro.
    // Se guardan hasheados con HMAC (src/lib/rate-limit.ts) justamente para que
    // `intentos` no sea una base de datos personales bajo la Ley 18.331.
    // Este check mira las filas reales, no la teoría.
    const { data: filas } = await admin.from('intentos').select('clave').limit(500)
    const sospechosas = (filas ?? [])
      .map((f) => f.clave)
      .filter((c) => c.includes('@') || /\b\d{1,3}(\.\d{1,3}){3}\b/.test(c))
    check(
      'la tabla intentos NO guarda mails ni IPs en claro',
      sospechosas.length === 0,
      sospechosas.length > 0 ? `encontradas: ${sospechosas.slice(0, 3).join(', ')}` : `${filas?.length ?? 0} filas revisadas`
    )
  }
}

/*
  Limpieza del caso de prueba del guardrail.

  OJO: mientras la bateria corre, esa propiedad esta 'disponible' y por lo tanto
  VISIBLE en la web publica — son unos segundos, pero el sitio ya esta en
  produccion. Por eso se borra si o si aca, y tambien al empezar por si una
  corrida anterior quedo cortada a la mitad.
  Si alguna vez ves "ZZGUARDRAIL" en la web, corre la bateria de nuevo.
*/
await admin.from('propiedades').delete().eq('codigo', CODIGO_PRUEBA)
{
  const { data: quedo } = await admin.from('propiedades').select('codigo').eq('codigo', CODIGO_PRUEBA)
  check('el caso de prueba se borro de la base', (quedo?.length ?? 0) === 0, 'quedo colgado en produccion')
}

console.log(fallas === 0 ? '\nTodo verificado. El guardrail estructural está activo.' : `\n${fallas} CHECKS FALLARON — revisar antes de seguir.`)
process.exit(fallas === 0 ? 0 : 1)
