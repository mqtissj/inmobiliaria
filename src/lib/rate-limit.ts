// SOLO desde código de servidor (Server Actions y Route Handlers): usa la
// service_role key, que nunca puede salir al navegador (CLAUDE.md §4.4).
//
// El contador vive en Postgres, no en memoria: en Vercel cada instancia
// serverless tendría su propio Map y se borraría en cada arranque en frío.
// Ver docs/sql/2026-08-17-rate-limit.sql para el porqué completo.
import { createHmac } from 'node:crypto'
import { headers } from 'next/headers'
import { supabaseAdmin } from './supabase'

/*
  De dónde sale la IP.

  `x-forwarded-for` lo puede escribir cualquiera: si confiáramos en él a ciegas,
  el atacante mandaría una IP distinta en cada pedido y el límite no serviría
  para nada. Por eso el orden de preferencia es del header más difícil de
  falsificar al más fácil:
   1. x-vercel-forwarded-for — lo pone la red de Vercel, pisando lo que venga.
   2. x-real-ip — también lo pone el proxy.
   3. x-forwarded-for — último recurso; se toma la PRIMERA entrada, que es la
      del cliente original.
  En desarrollo local no hay proxy y no llega ninguno: se usa una clave fija,
  que alcanza para poder probar el límite con `npm run dev`.

  Esta función NO se exporta: la IP en crudo no tiene que salir de este archivo.
*/
async function ipDelCliente(): Promise<string> {
  const h = await headers() // async en Next 16
  const vercel = h.get('x-vercel-forwarded-for')
  if (vercel) return vercel.split(',')[0].trim()
  const real = h.get('x-real-ip')
  if (real) return real.trim()
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return 'local'
}

/*
  LO QUE SE GUARDA EN LA BASE NO ES LA IP NI EL MAIL, ES UN HMAC DE ELLOS.

  Por qué importa: una dirección IP es un dato personal, y un mail más todavía.
  Guardarlos en claro para contar intentos convertiría a `intentos` en una base
  de datos personales — con todo lo que eso implica bajo la Ley 18.331, y
  contradiciendo lo que dice nuestra propia política de privacidad.

  Para contar intentos NO hace falta saber de quién son: alcanza con poder decir
  "esto es el mismo de antes". Un hash cumple exactamente eso.

  Por qué HMAC y no un SHA-256 pelado: el espacio de direcciones IPv4 tiene
  4.300 millones de valores. Cualquiera con la tabla en la mano podría hashear
  todas y revertir el dato en minutos. Con HMAC hace falta además el secreto,
  que vive solo en el servidor.

  El secreto sale de RATE_LIMIT_SALT si existe; si no, de la service_role key,
  que ya es un secreto de servidor. Es a propósito: si el salt faltara en
  producción, los hashes serían distintos a los de desarrollo y el límite
  fallaría en silencio. Que rote el secreto no rompe nada — lo único que pasa
  es que los contadores (que viven 24 horas) arrancan de cero.

  El prefijo de espacio queda legible ('login:ip:') para poder mirar la tabla y
  entender qué es cada fila. Un prefijo no identifica a nadie.
*/
function hashear(valor: string): string {
  const secreto = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return createHmac('sha256', secreto)
    .update(valor.trim().toLowerCase())
    .digest('base64url')
    .slice(0, 32)
}

/** Clave de la IP de quien está pidiendo, ya hasheada. */
export async function claveDeIP(espacio: string): Promise<string> {
  return `${espacio}:${hashear(await ipDelCliente())}`
}

/** Clave de un dato cualquiera (un mail, un id de conversación), ya hasheada. */
export function claveDe(espacio: string, valor: string): string {
  return `${espacio}:${hashear(valor)}`
}

export interface ResultadoLimite {
  permitido: boolean
  /** Segundos que faltan para poder reintentar. Solo tiene sentido si permitido = false. */
  esperaSegundos: number
}

/*
  Registra un intento contra todas las claves a la vez y dice si se pasó.
  Basta con que UNA clave esté abusada para frenar: así una misma IP no puede
  probar contraseñas de muchos mails, ni muchas IPs martillar un solo mail.

  Si la base falla, se DEJA PASAR (permitido: true). Es una decisión consciente:
  el rate limit es una protección extra, y si Postgres tiene un problema
  preferimos que el dueño de la inmobiliaria pueda entrar a su panel antes que
  dejarlo afuera por una falla nuestra. El login sigue protegido por la
  contraseña y por los límites propios de Supabase.
*/
export async function registrarIntento(
  claves: string[],
  limite: number,
  ventanaMinutos: number
): Promise<ResultadoLimite> {
  try {
    const { data, error } = await supabaseAdmin().rpc('registrar_intento', {
      p_claves: claves,
      p_limite: limite,
      p_ventana_minutos: ventanaMinutos,
    })
    if (error) {
      console.error('[rate-limit] no se pudo registrar el intento:', error)
      return { permitido: true, esperaSegundos: 0 }
    }
    // La función devuelve una tabla de una sola fila
    const fila = Array.isArray(data) ? data[0] : data
    if (!fila) return { permitido: true, esperaSegundos: 0 }
    return {
      permitido: fila.permitido !== false,
      esperaSegundos: Number(fila.espera_segundos ?? 0),
    }
  } catch (e) {
    console.error('[rate-limit] excepción al registrar el intento:', e)
    return { permitido: true, esperaSegundos: 0 }
  }
}

/** Tras un intento exitoso: los tipeos previos no tienen que seguir contando. */
export async function limpiarIntentos(claves: string[]): Promise<void> {
  try {
    await supabaseAdmin().rpc('limpiar_intentos', { p_claves: claves })
  } catch (e) {
    console.error('[rate-limit] no se pudieron limpiar los intentos:', e)
  }
}

/** "En 3 minutos", "en 45 segundos" — para escribirlo en el mensaje de error. */
export function textoDeEspera(segundos: number): string {
  if (segundos < 60) return `${segundos} segundo${segundos === 1 ? '' : 's'}`
  const minutos = Math.ceil(segundos / 60)
  return `${minutos} minuto${minutos === 1 ? '' : 's'}`
}
