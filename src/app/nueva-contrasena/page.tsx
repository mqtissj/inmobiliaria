import type { Metadata } from 'next'
import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase-server'
import { AuthShell, AvisoError } from '@/components/ui/AuthShell'
import { NuevaContrasenaForm } from './NuevaContrasenaForm'

// Página privada: no tiene nada que hacer en Google (REGLAS: noindex)
export const metadata: Metadata = {
  title: 'Poner una contraseña nueva',
  robots: { index: false, follow: false },
}

/*
  A esta pantalla solo se llega desde /auth/callback, que ya canjeó el código
  del mail por una sesión. Si alguien entra escribiendo la URL a mano no tiene
  sesión, y en vez de mostrarle un formulario que va a fallar al enviar, se le
  explica qué pasó y cómo salir de ahí.
*/
export default async function NuevaContrasenaPage() {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <AuthShell
        titulo="Este link ya no sirve"
        bajada="Los links de recuperación valen una sola vez y por un rato."
      >
        <AvisoError titulo="No pudimos validar el link">
          Puede que ya lo hayas usado, que haya vencido, o que lo hayas abierto en otro navegador
          distinto al que pidió el mail. Pedí uno nuevo y abrilo en el mismo navegador.
        </AvisoError>
        <Link
          href="/recuperar"
          className="mt-4 block w-full rounded-md bg-pf-blue px-4 py-2.5 text-center font-semibold text-surface transition-colors hover:bg-pf-navy"
        >
          Pedir un link nuevo
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      titulo="Poner una contraseña nueva"
      bajada={
        <>
          Estás cambiando la contraseña de{' '}
          <span className="font-semibold text-ink">{user.email}</span>.
        </>
      }
      pie="Cuando la guardes entrás derecho al panel."
    >
      <NuevaContrasenaForm />
    </AuthShell>
  )
}
