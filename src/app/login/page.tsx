import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/components/ui/AuthShell'
import { LoginForm } from './LoginForm'

// Página privada: no tiene nada que hacer en Google (REGLAS: noindex en login)
export const metadata: Metadata = {
  title: 'Entrar al panel',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <AuthShell
      titulo="Panel de PF Negocios Inmobiliarios"
      bajada={
        <>
          Acceso para el equipo. ¿Buscás una propiedad? Está todo en la{' '}
          <Link href="/" className="font-semibold text-pf-blue hover:underline">
            página principal
          </Link>
          .
        </>
      }
      pie="¿Problemas para entrar? Escribile a Matías, que administra el sistema."
    >
      <LoginForm />
    </AuthShell>
  )
}
