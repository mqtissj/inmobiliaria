'use server'

/*
  "Olvidé mi contraseña": manda el mail con el link para definir una nueva.

  DOS COSAS QUE NO SON OBVIAS Y CONVIENE PODER EXPLICAR:

  1. Esto NO es una consulta sin efectos. @supabase/ssr fuerza el flujo PKCE
     (lo escribe después de las opciones que uno pase, así que no se puede
     cambiar: node_modules/@supabase/ssr/dist/main/createServerClient.js).
     Con PKCE, resetPasswordForEmail genera un "code verifier" y lo GUARDA en
     el storage del cliente ANTES de pegarle a la API — y con createServerClient
     ese storage son las cookies del navegador. Por eso tiene que ser una Server
     Action: en el render de un Server Component no se pueden escribir cookies.

  2. Como el verifier queda en las cookies de ESTE navegador, el link del mail
     tiene que abrirse en el MISMO navegador donde se pidió. Si lo pide en la
     computadora y abre el mail en el celular, falla con "code verifier not
     found". Está avisado en la pantalla.

  El mensaje de respuesta es SIEMPRE el mismo, exista o no el mail: Supabase
  responde igual justamente para no revelar qué cuentas existen, y si nosotros
  distinguiéramos estaríamos filtrando lo que la librería protege.
*/
import { headers } from 'next/headers'
import { supabaseServer } from '@/lib/supabase-server'
import { claveDe, claveDeIP, registrarIntento, textoDeEspera } from '@/lib/rate-limit'

// Más ajustado que el del login: mandar mails cuesta, y el SMTP de Supabase
// tiene su propio límite por hora que no conviene quemar.
const LIMITE_INTENTOS = 3
const VENTANA_MINUTOS = 15

export interface EstadoRecuperar {
  error: string | null
  enviado?: boolean
  // Mismo motivo que en el login: React 19 resetea el <form> en cada envío.
  intento?: number
  email?: string
}

/*
  El dominio donde está corriendo la app, sacado de los headers del pedido.
  Se arma así y no con una variable de entorno para que ande igual en local
  (http://localhost:3000) y en Vercel, sin tener que mantener otra variable.
*/
async function origenDelSitio(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const protocolo = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${protocolo}://${host}`
}

export async function pedirRecuperacion(
  estado: EstadoRecuperar,
  formData: FormData
): Promise<EstadoRecuperar> {
  const email = String(formData.get('email') ?? '').trim()

  const fallo = (mensaje: string): EstadoRecuperar => ({
    error: mensaje,
    intento: (estado.intento ?? 0) + 1,
    email,
  })

  if (!email) return fallo('Escribí tu mail.')

  // Hasheados, igual que en el login: la tabla nunca ve la IP ni el mail reales
  const claves = [await claveDeIP('recuperar:ip'), claveDe('recuperar:mail', email)]
  const limite = await registrarIntento(claves, LIMITE_INTENTOS, VENTANA_MINUTOS)
  if (!limite.permitido) {
    return fallo(
      `Ya pediste el mail varias veces. Esperá ${textoDeEspera(limite.esperaSegundos)} y probá de nuevo. ` +
        'Revisá también la carpeta de correo no deseado.'
    )
  }

  const supabase = await supabaseServer()
  // El link del mail vuelve con ?code=... a este callback, que lo canjea por
  // sesión y recién ahí manda a definir la contraseña.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origenDelSitio()}/auth/callback?next=/nueva-contrasena`,
  })

  if (error) {
    // Un 429 acá es el límite propio de Supabase, no el nuestro
    console.error('[pedirRecuperacion] error de Supabase:', error)
    if (error.status === 429) {
      return fallo('Se pidieron demasiados mails seguidos. Esperá unos minutos y probá otra vez.')
    }
    return fallo('No pudimos mandar el mail. Esperá unos segundos y volvé a intentar.')
  }

  return { error: null, enviado: true, email }
}
