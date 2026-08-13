import Link from 'next/link'

/*
  Formato de error de REGLAS-CLAUDE.md: qué pasó + qué hacer + reintentar.
  Nunca un mensaje crudo de librería ni un "Error 500" pelado.
*/
export function ErrorBox({
  titulo,
  queHacer,
  reintentarHref,
}: {
  titulo: string
  queHacer: string
  reintentarHref?: string
}) {
  return (
    <div className="rounded-md border border-pf-coral/40 bg-pf-coral-soft/50 p-5">
      <p className="font-semibold text-ink">{titulo}</p>
      <p className="mt-1 text-sm text-ink-soft">{queHacer}</p>
      {reintentarHref && (
        <Link
          href={reintentarHref}
          className="mt-3 inline-block rounded-md bg-pf-navy px-4 py-2 text-sm font-semibold text-surface hover:bg-pf-blue"
        >
          Reintentar
        </Link>
      )}
    </div>
  )
}
