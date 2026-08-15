import Link from 'next/link'

/*
  Filtros como links (chips): cero JavaScript en el cliente.
  Cada chip arma la URL con searchParams y el Server Component re-renderiza
  filtrado. El estado vive en la URL — compartible por WhatsApp, que acá importa.

  Los chips se derivan de las propiedades cargadas, no de una lista inventada:
  si la inmobiliaria no tiene galpones, no hay chip "galpón"; si ninguna
  propiedad tiene 3 dormitorios, no hay chip "3 dormitorios".
  (El de dormitorios fue pedido del cliente el 15/8: con varias casas parecidas,
  precisa que se puedan distinguir de un vistazo.)
*/
export function FilterChips({
  operacionActiva,
  tipoActivo,
  tiposDisponibles,
  dormitoriosActivo,
  dormitoriosDisponibles,
}: {
  operacionActiva?: string
  tipoActivo?: string
  tiposDisponibles: string[]
  dormitoriosActivo?: number
  dormitoriosDisponibles: number[]
}) {
  // Cada chip declara el estado COMPLETO al que lleva; lo que no se pasa, se apaga.
  const href = (destino: { operacion?: string; tipo?: string; dormitorios?: number }) => {
    const params = new URLSearchParams()
    if (destino.operacion) params.set('operacion', destino.operacion)
    if (destino.tipo) params.set('tipo', destino.tipo)
    if (destino.dormitorios) params.set('dormitorios', String(destino.dormitorios))
    const qs = params.toString()
    return qs ? `/?${qs}` : '/'
  }

  // Estado actual, para que cada grupo de chips preserve los otros filtros
  const actual = { operacion: operacionActiva, tipo: tipoActivo, dormitorios: dormitoriosActivo }

  const chip = (activo: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
      activo
        ? 'bg-pf-navy text-surface'
        : 'border border-line bg-surface text-ink-soft hover:border-pf-blue hover:text-pf-blue'
    }`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={href({ ...actual, operacion: undefined })} className={chip(!operacionActiva)}>
        Todas
      </Link>
      <Link href={href({ ...actual, operacion: 'venta' })} className={chip(operacionActiva === 'venta')}>
        Comprar
      </Link>
      <Link href={href({ ...actual, operacion: 'alquiler' })} className={chip(operacionActiva === 'alquiler')}>
        Alquilar
      </Link>

      {tiposDisponibles.length > 1 && (
        <>
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
          {tiposDisponibles.map((t) => (
            <Link
              key={t}
              href={href({ ...actual, tipo: tipoActivo === t ? undefined : t })}
              className={chip(tipoActivo === t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Link>
          ))}
        </>
      )}

      {dormitoriosDisponibles.length > 0 && (
        <>
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
          {dormitoriosDisponibles.map((d) => (
            <Link
              key={d}
              href={href({ ...actual, dormitorios: dormitoriosActivo === d ? undefined : d })}
              className={chip(dormitoriosActivo === d)}
            >
              {d} {d === 1 ? 'dormitorio' : 'dormitorios'}
            </Link>
          ))}
        </>
      )}
    </div>
  )
}
