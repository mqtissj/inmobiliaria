'use server'

// El login es una Server Action: la contraseña viaja una sola vez al servidor,
// Supabase valida, y la sesión queda en cookies httpOnly (JavaScript del
// navegador no puede leerla). Toda action es un endpoint POST público, así que
// el mensaje de error no distingue si falló el mail o la contraseña.
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'

export interface EstadoLogin {
  error: string | null
}

export async function iniciarSesion(_estado: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Completá el mail y la contraseña.' }
  }

  const supabase = await supabaseServer()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Mensaje propio, nunca el de la librería en inglés (REGLAS-CLAUDE.md)
    return { error: 'Mail o contraseña incorrectos. Revisá los datos e intentá de nuevo.' }
  }

  // redirect lanza una excepción de control de Next: va FUERA de todo try/catch
  redirect('/admin')
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await supabaseServer()
  await supabase.auth.signOut()
  redirect('/login')
}
