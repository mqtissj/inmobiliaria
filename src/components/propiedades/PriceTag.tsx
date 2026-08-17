import { formatoPrecio } from '@/lib/format'
import type { Propiedad } from '@/lib/types'

/*
  El precio en serif y con tabular-nums (los números alinean en el listado).
  Cuando la view devuelve precio null (precio_publico=false o sin cargar),
  se dice "Consultar precio" — jamás se inventa ni se estima un número.
*/
export function PriceTag({
  propiedad,
  tamano = 'card',
}: {
  propiedad: Pick<Propiedad, 'precio' | 'moneda' | 'precio_publico'>
  tamano?: 'card' | 'ficha'
}) {
  const precio = formatoPrecio(propiedad)
  const base = tamano === 'ficha' ? 'text-2xl' : 'text-lg'

  if (!precio) {
    return <p className={`${base} font-display italic text-ink-faint`}>Consultar precio</p>
  }
  // Azul PF y no marino: el precio es EL dato de cada tarjeta, y es donde la
  // marca se ve en todo el listado (pedido del cliente del 17/8: más azul)
  return <p className={`${base} font-display font-semibold tabular-nums text-pf-blue`}>{precio}</p>
}
