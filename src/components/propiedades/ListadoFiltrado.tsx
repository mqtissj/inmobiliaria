'use client'

import { useSearchParams } from 'next/navigation'
import { linkWhatsApp } from '@/lib/format'
import { filtrarPropiedades, leerFiltros } from '@/lib/filtros'
import type { FiltrosListado } from '@/lib/filtros'
import type { Propiedad } from '@/lib/types'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'
import { FilterPanel, resumenFiltros } from './FilterPanel'
import type { DisponiblesFiltros } from './FilterPanel'
import { PropertyCard } from './PropertyCard'

/*
  Los filtros del listado, aplicados EN EL NAVEGADOR.

  POR QUÉ (7/9/2026): mientras la home leía searchParams en el servidor, era una
  ruta dinámica, y eso significa que CADA visita ejecutaba una función en Vercel.
  Medido: 2,1 millones de invocaciones en 7 días solo en `/`, casi todas de bots.
  Sacando la lectura de searchParams del servidor, la home pasa a ser estática y
  la sirve el CDN sin ejecutar nada.

  El listado completo ya venía en memoria (una sola lectura cacheada, ver
  src/lib/queries.ts), así que filtrar acá no cuesta ni un pedido más: son 11
  propiedades y la misma función `filtrarPropiedades` que usa el servidor.

  QUÉ SE PIERDE, PARA QUE CONSTE: sin JavaScript los filtros dejan de aplicarse
  y se ve el listado completo. Antes andaban porque los chips son <Link> y el
  servidor resolvía el filtro. Hoy quien no ejecuta JS ve todas las propiedades
  en vez de un subconjunto, que es el modo de fallar correcto: se ve de más, no
  de menos, y los datos del negocio y las fichas siguen todos en el HTML.
*/

interface Props {
  /** El listado COMPLETO. Los filtros se aplican sobre esto, sin volver a pedir nada. */
  todas: Propiedad[]
  /** id de propiedad -> url de portada. Objeto y no Map: tiene que cruzar a cliente. */
  portadas: Record<string, string>
  disponibles: DisponiblesFiltros
  whatsapp: string
}

/*
  La parte que se ve, sin hooks: recibe los filtros ya resueltos.

  Existe separada porque la usan los dos lados del <Suspense> de la home: el
  fallback la renderiza SIN filtros (y eso es lo que queda en el HTML estático,
  que es lo que lee Google), y el componente de abajo la renderiza con los
  filtros de la URL una vez que hidrata.
*/
export function FiltrosYListado({
  todas,
  portadas,
  disponibles,
  whatsapp,
  filtros,
}: Props & { filtros: FiltrosListado }) {
  const propiedades = filtrarPropiedades(todas, filtros)
  // FilterPanel espera las dos siempre presentes; leerFiltros ya las garantiza,
  // pero el fallback pasa `{}` y sin esto los chips no sabrían qué está activo.
  const actual = {
    ...filtros,
    caracteristicas: filtros.caracteristicas ?? [],
    garaje: filtros.garaje ?? false,
  }

  return (
    <>
      <section className="border-b border-line-soft bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <FilterPanel actual={actual} disponibles={disponibles} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-ink-faint">
          {propiedades.length === 1 ? '1 propiedad' : `${propiedades.length} propiedades`}
          {resumenFiltros(actual)}
        </p>

        {propiedades.length > 0 ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {propiedades.map((p) => (
              <PropertyCard key={p.id} propiedad={p} fotoUrl={portadas[p.id]} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-line-soft bg-surface p-8 text-center">
            <p className="font-semibold text-ink">
              Ahora mismo no tenemos propiedades con ese filtro.
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Escribinos por WhatsApp y te avisamos apenas entre una que te sirva.
            </p>
            <div className="mt-4 flex justify-center">
              <WhatsAppLink href={linkWhatsApp(whatsapp)}>Avisame</WhatsAppLink>
            </div>
          </div>
        )}
      </section>
    </>
  )
}

/*
  useSearchParams va SOLO acá adentro, y este componente va SIEMPRE dentro de un
  <Suspense>. En una página prerenderizada, el hook hace que su rama se renderice
  en el cliente y lo que se manda en el HTML es el fallback (docs de esta versión:
  node_modules/next/dist/docs/.../functions/use-search-params.md).

  Por eso el fallback de la home es el listado completo y no un cartel de
  "cargando": lo que Google lee es el fallback.
*/
export function ListadoFiltrado(props: Props) {
  const params = useSearchParams()
  return <FiltrosYListado {...props} filtros={leerFiltros(params)} />
}
