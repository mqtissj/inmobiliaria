// Setup de desarrollo — idempotente, se puede correr más de una vez.
// Corre con: node scripts/setup-dev.mjs
// Usa la SERVICE_ROLE_KEY de .env.local, por eso vive en scripts/ y jamás en src/.
//
// Hace 4 cosas:
//  1. Crea el bucket de fotos si no existe (lectura pública, 5 MB máx, solo imágenes)
//  2. Completa config_negocio con los datos reales de PF (estaban en placeholder)
//  3. Crea el usuario de prueba del panel si no existe
//  4. Descubre qué valores aceptan los CHECK de la tabla propiedades
//     (insertando y borrando filas de prueba — la base es la fuente de verdad, no la memoria)

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

// ---------- 1. Bucket de fotos ----------
const BUCKET = 'fotos-propiedades'
{
  const { data: buckets } = await admin.storage.listBuckets()
  if (buckets?.some((b) => b.name === BUCKET)) {
    console.log(`bucket ${BUCKET}: ya existe`)
  } else {
    const { error } = await admin.storage.createBucket(BUCKET, {
      public: true, // lectura pública: las fotos de propiedades son públicas por definición
      fileSizeLimit: '5MB',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    })
    console.log(`bucket ${BUCKET}:`, error ? `ERROR ${error.message}` : 'creado')
  }
}

// ---------- 2. Config del negocio con datos reales ----------
// Datos confirmados por Matías el 12/8/2026 (WhatsApp del linktree de IG de PF).
// Horario y Facebook actualizados el 17/8 con PREGUNTAS.txt del cliente
// (sábados NO se atiende — por eso el horario ya no los nombra).
const config = [
  { clave: 'nombre', valor: 'PF Negocios Inmobiliarios' },
  { clave: 'direccion', valor: '25 de Mayo 329, Tacuarembó' },
  { clave: 'telefono', valor: '098 756 490' },
  { clave: 'horario', valor: 'Lunes a viernes de 9 a 12 y de 15:30 a 18' },
  { clave: 'whatsapp', valor: '59898756490' }, // formato wa.me, sin + ni espacios
  { clave: 'instagram', valor: 'pf_negocios_inmobiliarios' },
  { clave: 'facebook', valor: 'inmb.catalina' }, // facebook.com/inmb.catalina
]
{
  const { error } = await admin.from('config_negocio').upsert(config, { onConflict: 'clave' })
  console.log('config_negocio:', error ? `ERROR ${error.message}` : `${config.length} claves cargadas`)
}

// ---------- 3. Usuario de prueba del panel ----------
// Solo para desarrollo. El usuario real de la inmobiliaria se crea el día de la entrega.
//
// LAS CREDENCIALES SALEN DE .env.local, NO DEL CODIGO (18/8/2026).
// Estaban escritas acá en texto plano, y este repo es PUBLICO: cualquiera que
// lo encontrara tenia usuario y contrasena del panel de produccion. .env.local
// esta en .gitignore, asi que ahi no se publican.
const TEST_EMAIL = process.env.PANEL_TEST_EMAIL
const TEST_PASSWORD = process.env.PANEL_TEST_PASSWORD
if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error('Falta PANEL_TEST_EMAIL o PANEL_TEST_PASSWORD en .env.local — no se crea el usuario de prueba.')
  process.exit(1)
}
{
  const { data } = await admin.auth.admin.listUsers()
  const existe = data?.users?.some((u) => u.email === TEST_EMAIL)
  if (existe) {
    console.log(`usuario ${TEST_EMAIL}: ya existe`)
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true, // sin mail de confirmación: es un usuario precargado
    })
    console.log(`usuario ${TEST_EMAIL}:`, error ? `ERROR ${error.message}` : 'creado')
  }
}

// ---------- 4. Descubrir constraints reales de la tabla ----------
// Insertamos filas de prueba con cada valor candidato y las borramos al toque.
// Lo que la base rechaza no va en los formularios; lo que acepta, sí.
async function probar(campo, candidatos, base) {
  const aceptados = []
  for (const valor of candidatos) {
    const fila = { ...base, codigo: `ZZTEST-${campo}-${valor}`.slice(0, 20), [campo]: valor }
    const { error } = await admin.from('propiedades').insert(fila)
    if (!error) {
      aceptados.push(valor)
      await admin.from('propiedades').delete().eq('codigo', fila.codigo)
    } else if (!error.message.includes('check')) {
      // error que no es de CHECK (p. ej. columna inexistente): conviene verlo
      console.log(`  (${campo}=${valor}: ${error.message})`)
    }
  }
  console.log(`${campo}: acepta [${aceptados.join(', ')}]`)
  return aceptados
}

const base = {
  titulo: 'FILA DE PRUEBA — borrar',
  operacion: 'venta',
  tipo: 'casa',
  estado: 'disponible',
  departamento: 'Tacuarembó',
  ciudad: 'Tacuarembó',
  moneda: 'USD',
  precio_publico: false,
}

console.log('\nConstraints reales (probado contra la base):')
await probar('tipo', ['casa', 'apartamento', 'campo', 'chacra', 'terreno', 'local', 'galpon'], base)
await probar('operacion', ['venta', 'alquiler', 'traspaso', 'alquiler_temporal'], base)
await probar('estado', ['disponible', 'reservada', 'vendida', 'alquilada', 'retirada', 'oculta'], base)
await probar('moneda', ['USD', 'UYU', 'UI'], base)

// Limpieza defensiva por si algún delete falló
await admin.from('propiedades').delete().like('codigo', 'ZZTEST-%')
console.log('\nSetup listo.')
