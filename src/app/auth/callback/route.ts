import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

/*
  Adonde vuelve el usuario cuando hace clic en el link del mail.

  POR QUÉ HACE FALTA ESTE ARCHIVO:
  @supabase/ssr fuerza el flujo PKCE (lo escribe pisando cualquier opción que
  uno pase). En PKCE el mail NO trae una sesión ya hecha: trae un `?code=` de un
  solo uso que hay que canjear contra Supabase con exchangeCodeForSession, y ese
  canje necesita el "code verifier" que quedó guardado en las cookies cuando se
  pidió el mail. Por eso el canje va acá, en el servidor, y no en la pantalla.

  Un Route Handler puede escribir cookies (los docs de Next 16 lo dicen
  explícitamente para cookies() en Route Handlers), así que la sesión que
  devuelve el canje queda guardada en la respuesta de la redirección.

  Este archivo NO entra en el matcher de src/proxy.ts a propósito: el proxy
  redirige según haya sesión o no, y acá justamente todavía no la hay.
*/
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const destinoPedido = searchParams.get('next') ?? '/admin'

  /*
    Solo rutas internas. Sin este chequeo, alguien podría mandar un link con
    ?next=https://sitio-falso.com y usar nuestro dominio para rebotar a los
    usuarios hacia otro lado (open redirect). Se exige que empiece con "/" y
    que NO empiece con "//", que el navegador interpreta como otro dominio.
  */
  const destino =
    destinoPedido.startsWith('/') && !destinoPedido.startsWith('//') ? destinoPedido : '/admin'

  if (!code) {
    return NextResponse.redirect(new URL('/recuperar?error=link', origin))
  }

  const supabase = await supabaseServer()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // Los casos reales: el link ya se usó, venció, o se abrió en otro navegador
    // (ahí falta el code verifier, que vive en las cookies del que lo pidió).
    console.error('[auth/callback] no se pudo canjear el código:', error)
    return NextResponse.redirect(new URL('/recuperar?error=link', origin))
  }

  return NextResponse.redirect(new URL(destino, origin))
}
