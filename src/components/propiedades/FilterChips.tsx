import Link from 'next/link'

/*
  Filtros como links (chips): cero JavaScript en el cliente.
  Cada chip arma la URL con searchParams y el Server Component re-renderiza
  filtrado. El estado vive en la URL — compartible por WhatsApp, que acá importa.

  Los tipos disponibles se derivan de las propiedades cargadas, no de una
  lista inventada: si la inmobiliaria no tiene galpones, no hay chip "galpón".
*/
export function FilterChips({
  operacionActiva,
  tipoActivo,
  tiposDisponibles,
}: {
  operacionActiva?: string
  tipoActivo?: string
  tiposDisponibles: string[]
}) {
  const href = (op?: string, tipo?: string) => {
    const params = new URLSearchParams()
    if (op) params.set('operacion', op)
    if (tipo) params.set('tipo', tipo)
    const qs = params.toString()
    return qs ? `/?${qs}` : '/'
  }

  const chip = (activo: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
      activo
        ? 'bg-pf-navy text-surface'
        : 'border border-line bg-surface text-ink-soft hover:border-pf-blue hover:text-pf-blue'
    }`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={href(undefined, tipoActivo)} className={chip(!operacionActiva)}>
        Todas
      </Link>
      <Link href={href('venta', tipoActivo)} className={chip(operacionActiva === 'venta')}>
        Comprar
      </Link>
      <Link href={href('alquiler', tipoActivo)} className={chip(operacionActiva === 'alquiler')}>
        Alquilar
      </Link>

      {tiposDisponibles.length > 1 && (
        <>
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
          {tiposDisponibles.map((t) => (
            <Link
              key={t}
              href={href(operacionActiva, tipoActivo === t ? undefined : t)}
              className={chip(tipoActivo === t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Link>
          ))}
        </>
      )}
    </div>
  )
}
