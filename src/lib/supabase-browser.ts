'use client'

// Cliente de Supabase para componentes del navegador. Comparte la sesión con
// el servidor vía cookies (por eso @supabase/ssr y no el createClient pelado).
// Hoy lo usa solo la subida de fotos del panel: los archivos van directo del
// navegador al bucket con el token del usuario logueado — sin pasar por una
// Server Action (que tiene límite de 1 MB de body por defecto en Next 16).
import { createBrowserClient } from '@supabase/ssr'

export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
