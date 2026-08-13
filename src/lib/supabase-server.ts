// SOLO importar desde código de servidor (Server Components, Server Actions).
// Cliente de Supabase atado a las cookies del request: así los Server
// Components saben QUIÉN está logueado, y RLS aplica sus políticas de
// `authenticated` en vez de las de `anon`.
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function supabaseServer() {
  const cookieStore = await cookies() // async en Next 16

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Durante el render de un Server Component no se pueden setear
            // cookies (limitación de HTTP: la respuesta ya empezó a salir).
            // No pasa nada: el refresco de sesión lo hace src/proxy.ts.
          }
        },
      },
    }
  )
}
