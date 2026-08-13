// En Next 16, middleware.ts pasó a llamarse proxy.ts y vive acá en src/
// (leído de node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md).
//
// Hace dos cosas, y nada más:
//  1. Refresca la sesión de Supabase si el access token venció (si no, un
//     usuario con el panel abierto quedaría "deslogueado" a la hora).
//  2. Chequeo optimista de acceso: sin sesión no entrás a /admin, con sesión
//     no tiene sentido ver /login.
// La seguridad REAL no vive acá: vive en RLS y en el chequeo del layout de
// /admin — los docs de Next son explícitos en que el proxy no debe ser la
// única línea de defensa.
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // El refresco de token escribe cookies nuevas: van al request (para
          // lo que sigue de este render) y a la response (para el navegador).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() valida el token contra Supabase (y lo refresca si venció)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ruta = request.nextUrl.pathname

  if (ruta.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (ruta === '/login' && user) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return response
}

// Solo corre donde hace falta: el panel y el login. La web pública no paga
// este costo (el matcher evita también estáticos e imágenes solos).
export const config = {
  matcher: ['/admin/:path*', '/login'],
}
