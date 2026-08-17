import Link from 'next/link'

/*
  Filtros como links (chips): cero JavaScript en el cliente.
  Cada chip arma la URL con searchParams y el Server Component re-renderiza
  filtrado. El estado vive en la URL — compartible por WhatsApp, que acá importa.

  Los chips se derivan de las propiedades cargadas, no de una lista inventada:
  si la inmobiliaria no tiene galpones, no hay chip "galpón"; si ninguna
  propiedad acepta mascotas, no hay chip de mascotas. Por eso "Traspaso",
  "Acepta mascotas" y "Para familia/pareja" (pedidos del cliente el 17/8)
  aparecen solos cuando el panel carga propiedades con esos datos.
*/
type Destino = {
  operacion?: string
  tipo?: string
  dormitorios?: number
  mascotas?: boolean
  ideal?: string
}

export function FilterChips({
  operacionActiva,
  tipoActivo,
  tiposDisponibles,
  dormitoriosActivo,
  dormitoriosDisponibles,
  hayTraspasos,
  mascotasActivo,
  hayMascotas,
  idealActivo,
  idealesDisponibles,
}: {
  operacionActiva?: string
  tipoActivo?: string
  tiposDisponibles: string[]
  dormitoriosActivo?: number
  dormitoriosDisponibles: number[]
  hayTraspasos: boolean
  mascotasActivo: boolean
  hayMascotas: boolean
  idealActivo?: string
  idealesDisponibles: string[]
}) {
  // Cada chip declara el estado COMPLETO al que lleva; lo que no se pasa, se apaga.
  const href = (destino: Destino) => {
    const params = new URLSearchParams()
    if (destino.operacion) params.set('operacion', destino.operacion)
    if (destino.tipo) params.set('tipo', destino.tipo)
    if (destino.dormitorios) params.set('dormitorios', String(destino.dormitorios))
    if (destino.mascotas) params.set('mascotas', 'si')
    if (destino.ideal) params.set('ideal', destino.ideal)
    const qs = params.toString()
    return qs ? `/?${qs}` : '/'
  }

  // Estado actual, para que cada grupo de chips preserve los otros filtros
  const actual: Destino = {
    operacion: operacionActiva,
    tipo: tipoActivo,
    dormitorios: dormitoriosActivo,
    mascotas: mascotasActivo,
    ideal: idealActivo,
  }

  const chip = (activo: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
      activo
        ? 'bg-pf-blue text-surface'
        : 'border border-line bg-surface text-ink-soft hover:border-pf-blue hover:text-pf-blue'
    }`

  const separador = <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />

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
      {hayTraspasos && (
        <Link href={href({ ...actual, operacion: 'traspaso' })} className={chip(operacionActiva === 'traspaso')}>
          Traspaso
        </Link>
      )}

      {tiposDisponibles.length > 1 && (
        <>
          {separador}
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
          {separador}
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

      {(hayMascotas || idealesDisponibles.length > 0) && (
        <>
          {separador}
          {idealesDisponibles.map((v) => (
            <Link
              key={v}
              href={href({ ...actual, ideal: idealActivo === v ? undefined : v })}
              className={chip(idealActivo === v)}
            >
              Para {v}
            </Link>
          ))}
          {hayMascotas && (
            <Link href={href({ ...actual, mascotas: !mascotasActivo })} className={chip(mascotasActivo)}>
              Acepta mascotas
            </Link>
          )}
        </>
      )}
    </div>
  )
}
