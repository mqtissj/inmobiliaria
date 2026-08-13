import type { Metadata } from 'next'
import { BrandMark } from '@/components/ui/BrandMark'
import { LoginForm } from './LoginForm'

// Página privada: no tiene nada que hacer en Google (REGLAS: noindex en login)
export const metadata: Metadata = {
  title: 'Entrar al panel',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <BrandMark className="h-12 w-12" />
          <h1 className="mt-3 font-display text-xl font-semibold text-pf-navy">
            Panel de PF Negocios Inmobiliarios
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Acceso para el equipo. ¿Buscás una propiedad? Está todo en la{' '}
            <a href="/" className="font-semibold text-pf-blue hover:underline">
              página principal
            </a>
            .
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-line-soft bg-surface p-6">
          <LoginForm />
        </div>

        <p className="mt-4 text-center text-xs text-ink-faint">
          ¿Problemas para entrar? Escribile a Matías, que administra el sistema.
        </p>
      </div>
    </div>
  )
}
