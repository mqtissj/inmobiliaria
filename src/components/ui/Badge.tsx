import type { EstadoPropiedad } from '@/lib/types'

// Al público solo llegan disponible/reservada (la view filtra el resto),
// pero el panel ve los cuatro estados — por eso el mapa está completo.
const ESTILOS: Record<EstadoPropiedad, string> = {
  disponible: 'bg-pf-teal-soft text-pf-teal',
  reservada: 'bg-pf-coral-soft text-pf-coral',
  vendida: 'bg-line-soft text-ink-faint',
  alquilada: 'bg-line-soft text-ink-faint',
}

export function BadgeEstado({ estado }: { estado: EstadoPropiedad }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${ESTILOS[estado]}`}
    >
      {estado}
    </span>
  )
}
