'use client'

import { useRouter } from 'next/navigation'

/*
  Filtro de dormitorios como desplegable (pedido del cliente, 17/8).

  Antes era un chip por cada cantidad cargada. Con pocas propiedades andaba,
  pero cada valor nuevo suma un botón: cargando casas de 1, 2, 3, 4 y 5
  dormitorios la barra de filtros se desborda en el celular. Un desplegable
  ocupa siempre lo mismo y ofrece todas las cantidades de 1 al máximo cargado.

  Es el ÚNICO filtro con JavaScript: los demás son links (Server Component
  puro, cero JS). Acá hace falta porque un <select> tiene que navegar cuando
  cambia — sin eso, el usuario elegiría un valor y no pasaría nada.

  El componente no sabe armar URLs: las recibe ya hechas desde el servidor
  (FilterChips), donde vive la única función que las construye. El `value` de
  cada opción ES su URL, así que cambiar de opción es navegar a ella. Si la
  lógica de filtros cambia, se toca en un solo lugar.
*/
export function DormitoriosSelect({
  opciones,
  seleccionada,
  activo,
}: {
  /** Cada opción con su URL de destino ya armada. */
  opciones: { etiqueta: string; href: string }[]
  /** La URL de la opción activa hoy (la que queda seleccionada). */
  seleccionada: string
  /** Si hay un filtro de dormitorios puesto, para pintarlo en azul como los chips. */
  activo: boolean
}) {
  const router = useRouter()

  return (
    <span className="relative inline-flex items-center">
      <select
        aria-label="Filtrar por cantidad de dormitorios"
        value={seleccionada}
        onChange={(e) => router.push(e.target.value)}
        className={`cursor-pointer appearance-none rounded-full border py-1.5 pl-4 pr-9 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-pf-blue/40 ${
          activo
            ? 'border-transparent bg-pf-blue text-surface'
            : 'border-line bg-surface text-ink-soft hover:border-pf-blue hover:text-pf-blue'
        }`}
      >
        {opciones.map((o) => (
          // El texto de las opciones lo pinta el sistema operativo, no la web:
          // por eso van sin clases, siempre legibles.
          <option key={o.href} value={o.href}>
            {o.etiqueta}
          </option>
        ))}
      </select>
      {/* Flecha propia: con appearance-none la nativa desaparece, y así hereda
          el color del chip (blanca sobre azul, gris cuando está apagado). */}
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`pointer-events-none absolute right-3 h-3.5 w-3.5 ${
          activo ? 'text-surface' : 'text-ink-faint'
        }`}
      >
        <path d="M5 8l5 5 5-5" />
      </svg>
    </span>
  )
}
