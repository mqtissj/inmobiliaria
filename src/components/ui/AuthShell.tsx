import Link from 'next/link'
import { BrandMark } from '@/components/ui/BrandMark'

/*
  El marco de las tres pantallas de acceso: entrar, pedir la contraseña nueva
  y definirla. Está compartido a propósito — son la misma pantalla con distinto
  contenido, y si el marco viviera tres veces se iría separando solo.

  Ninguna de las tres se indexa: eso lo pone cada page.tsx con
  `robots: { index: false }`, porque el metadata va en la página, no acá.
*/
export function AuthShell({
  titulo,
  bajada,
  children,
  pie,
}: {
  titulo: string
  bajada: React.ReactNode
  children: React.ReactNode
  pie?: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Link href="/" aria-label="Ir a la página principal">
            <BrandMark className="h-12 w-12" />
          </Link>
          <h1 className="mt-3 font-display text-xl font-semibold text-pf-navy">{titulo}</h1>
          <p className="mt-1 text-sm text-ink-soft">{bajada}</p>
        </div>

        <div className="mt-6 rounded-lg border border-line-soft bg-surface p-6">{children}</div>

        {pie && <div className="mt-4 text-center text-xs text-ink-faint">{pie}</div>}
      </div>
    </div>
  )
}

/** El cartel rojo de error, igual en las tres pantallas. */
export function AvisoError({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-pf-coral/40 bg-pf-coral-soft/50 px-4 py-3 text-sm">
      <p className="font-semibold text-ink">{titulo}</p>
      <p className="mt-0.5 text-ink-soft">{children}</p>
    </div>
  )
}
