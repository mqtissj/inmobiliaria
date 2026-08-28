import { createClient } from '@supabase/supabase-js'

/*
  Corte de espera de las lecturas públicas (28/8/2026).

  Ese día Supabase, que está detrás de Cloudflare, tardó hasta un minuto en
  contestar y devolvió 504 y 525. Sin corte, cada visitante se comía ese minuto
  mirando una página en blanco: el navegador espera lo que el servidor tarde.

  6 segundos porque el P75 real de estas lecturas es ~32 ms: enorme para
  operación normal, corto para alguien que está esperando. Al cortar, la
  lectura falla rápido y entra el respaldo de getConfig() — la web sigue en pie.
*/
const TIMEOUT_LECTURA_MS = 6_000

// Cliente público: respeta RLS. Se puede usar en cualquier lado.
// El timeout vive acá y no en cada query porque a este cliente lo usa SOLO
// queries.ts (las lecturas de la web pública). El panel y el rate limiting van
// por supabaseAdmin(), que no lo lleva: ahí una escritura lenta tiene que poder
// terminar.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    global: {
      fetch: (input, init) => {
        /*
          AbortController propio y NO AbortSignal.timeout(), aunque sea más
          corto de escribir: postgrest-js reintenta hasta 4 veces ante lo que
          le parece un error de red, y corta esos reintentos SOLO cuando el
          error se llama 'AbortError' (ver el catch de executeWithRetry en
          @supabase/postgrest-js). AbortSignal.timeout() lanza 'TimeoutError',
          que no entra en esa condición: medido, los 6 segundos se volvían 31
          entre reintentos y esperas. controller.abort() sin razón lanza
          AbortError, que postgrest respeta y propaga en el acto.

          Efecto secundario buscado: se pierden los reintentos cuando la base
          está LENTA, que es justo cuando no querés reintentar — la paciencia
          del visitante ya se gastó. Siguen vivos para lo que sí conviene
          reintentar: un 5xx o una conexión rechazada, que fallan rápido y no
          llegan a tocar este timeout.
        */
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), TIMEOUT_LECTURA_MS)
        return fetch(input, {
          ...init,
          // any() y no pisar init.signal: postgrest manda el suyo cuando
          // alguien usa .abortSignal(), y pisarlo lo dejaría sin efecto.
          signal: init?.signal
            ? AbortSignal.any([init.signal, controller.signal])
            : controller.signal,
          // clearTimeout o el timer queda vivo los 6 s después de una
          // respuesta rápida, reteniendo el event loop sin necesidad.
        }).finally(() => clearTimeout(timer))
      },
    },
  }
)

// Cliente admin: saltea RLS. SOLO en código de servidor.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
