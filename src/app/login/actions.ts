'use server'

// El login es una Server Action: la contraseña viaja una sola vez al servidor,
// Supabase valida, y la sesión queda en cookies httpOnly (JavaScript del
// navegador no puede leerla). Toda action es un endpoint POST público, así que
// el mensaje de error no distingue si falló el mail o la contraseña.
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import {
  claveDe,
  claveDeIP,
  limpiarIntentos,
  registrarIntento,
  textoDeEspera,
} from '@/lib/rate-limit'

/*
  Límite de intentos: 8 cada 15 minutos.
  El número está pensado para un panel que usan dos personas: deja lugar de
  sobra para equivocarse tipeando y corta cualquier intento de probar
  contraseñas en serie. Se cuenta por IP Y por mail, así una misma IP no puede
  recorrer mails distintos ni muchas IPs martillar un mail solo.
  Ver docs/sql/2026-08-17-rate-limit.sql.
*/
const LIMITE_INTENTOS = 8
const VENTANA_MINUTOS = 15

export interface EstadoLogin {
  error: string | null
  /*
    Mismo motivo que en el panel: React 19 resetea el <form> en cada envío, así
    que sin esto un intento fallido borraba también el mail y había que
    reescribirlo entero. `intento` sirve de `key` para remontar el formulario
    con el mail ya puesto.
    La CONTRASEÑA no vuelve nunca: que se borre es lo correcto, y además no
    tiene por qué viajar de vuelta al navegador.
  */
  intento?: number
  email?: string
}

export async function iniciarSesion(estado: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  const fallo = (mensaje: string): EstadoLogin => ({
    error: mensaje,
    intento: (estado.intento ?? 0) + 1,
    email,
  })

  if (!email || !password) {
    return fallo('Completá el mail y la contraseña.')
  }

  // El límite se chequea ANTES de tocar Supabase: si no, cada intento de
  // fuerza bruta igual le pegaría a la API de auth.
  // Ni la IP ni el mail viajan en claro a la base: van hasheados (ver rate-limit.ts)
  const claves = [await claveDeIP('login:ip'), claveDe('login:mail', email)]
  const limite = await registrarIntento(claves, LIMITE_INTENTOS, VENTANA_MINUTOS)
  if (!limite.permitido) {
    return fallo(
      `Demasiados intentos seguidos. Esperá ${textoDeEspera(limite.esperaSegundos)} y volvé a probar. ` +
        'Si no te acordás la contraseña, usá "¿Olvidaste tu contraseña?".'
    )
  }

  const supabase = await supabaseServer()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Mensaje propio, nunca el de la librería en inglés (REGLAS-CLAUDE.md).
    // Es el MISMO mensaje para "el mail no existe" y "la contraseña está mal":
    // distinguirlos le diría a un atacante qué mails son cuentas reales.
    return fallo('Mail o contraseña incorrectos. Revisá los datos e intentá de nuevo.')
  }

  // Entró bien: los tipeos anteriores dejan de contar.
  await limpiarIntentos(claves)

  // redirect lanza una excepción de control de Next: va FUERA de todo try/catch
  redirect('/admin')
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await supabaseServer()
  await supabase.auth.signOut()
  redirect('/login')
}
