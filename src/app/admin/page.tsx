import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase-server'
import { formatoPrecio } from '@/lib/format'
import type { Propiedad } from '@/lib/types'
import { BadgeEstado } from '@/components/ui/Badge'
import { ErrorBox } from '@/components/ui/ErrorBox'

/*
  Tabla del panel. Lee la TABLA completa (no la view): el equipo ve todos los
  estados y los precios reales — RLS lo permite porque la sesión es
  `authenticated`. La misma query con la anon key devolvería "permission denied".
*/
export default async function AdminPropiedades(props: PageProps<'/admin'>) {
  const sp = await props.searchParams
  const creada = typeof sp.creada === 'string' ? sp.creada : null
  const editada = typeof sp.editada === 'string' ? sp.editada : null
  const borrada = typeof sp.borrada === 'string' ? sp.borrada : null
  const conError = typeof sp.error === 'string' ? sp.error : null
  const fotosAviso = typeof sp.fotos === 'string' ? sp.fotos : null

  const supabase = await supabaseServer()
  const { data, error } = await supabase
    .from('propiedades')
    .select('*, propiedad_fotos(count)')
    .order('creado_en', { ascending: false })

  if (error) {
    return (
      <ErrorBox
        titulo="No pudimos cargar las propiedades"
        queHacer="Recargá la página. Si sigue pasando, avisale a Matías."
        reintentarHref="/admin"
      />
    )
  }

  const propiedades = (data ?? []) as (Propiedad & { propiedad_fotos: { count: number }[] })[]

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-pf-navy">Propiedades</h1>
          <p className="mt-0.5 text-sm text-ink-faint">
            {propiedades.length} cargadas · lo que está en “disponible” o “reservada” se ve en la
            web
          </p>
        </div>
        <Link
          href="/admin/propiedades/nueva"
          className="rounded-md bg-pf-blue px-4 py-2 text-sm font-semibold text-surface transition-colors hover:bg-pf-navy"
        >
          + Nueva propiedad
        </Link>
      </div>

      {(creada || editada) && (
        <div className="mt-4 rounded-md bg-pf-teal-soft px-4 py-3 text-sm font-semibold text-pf-teal">
          Propiedad {creada ?? editada} {creada ? 'creada' : 'actualizada'}{' '}
          {fotosAviso === 'error'
            ? '— pero alguna foto no subió; abrila en la web para verificar.'
            : 'y publicada.'}{' '}
          <a
            href={`/propiedades/${(creada ?? editada)!.toLowerCase()}`}
            className="underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            Verla en la web
          </a>
        </div>
      )}
      {borrada && (
        <div className="mt-4 rounded-md bg-line-soft px-4 py-3 text-sm font-semibold text-ink-soft">
          Propiedad {borrada} eliminada — se sacó de la web
          {fotosAviso === 'huerfanas'
            ? ', pero algún archivo de foto no se pudo borrar del almacenamiento. No se ve en ningún lado; avisale a Matías para limpiarlo.'
            : ' y sus fotos del almacenamiento.'}
        </div>
      )}
      {conError === 'borrar' && (
        <div className="mt-4 rounded-md border border-pf-coral/40 bg-pf-coral-soft/50 px-4 py-3 text-sm">
          <p className="font-semibold text-ink">No se pudo eliminar la propiedad</p>
          <p className="mt-0.5 text-ink-soft">Probá de nuevo desde su pantalla de edición.</p>
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-lg border border-line-soft bg-surface">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-ink-faint">
              <th className="px-4 py-3 font-semibold">Código</th>
              <th className="px-4 py-3 font-semibold">Título</th>
              <th className="px-4 py-3 font-semibold">Operación</th>
              <th className="px-4 py-3 font-semibold">Precio</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 text-right font-semibold">Fotos</th>
            </tr>
          </thead>
          <tbody>
            {propiedades.map((p) => {
              const precio = formatoPrecio({ ...p, precio_publico: true }) // el panel ve todo
              const nFotos = p.propiedad_fotos?.[0]?.count ?? 0
              return (
                <tr key={p.id} className="border-b border-line-soft last:border-0 hover:bg-paper">
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    <Link
                      href={`/admin/propiedades/${p.codigo.toLowerCase()}`}
                      className="text-pf-blue hover:underline"
                    >
                      {p.codigo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/propiedades/${p.codigo.toLowerCase()}`}
                      className="text-ink hover:text-pf-blue"
                    >
                      {p.titulo}
                    </Link>
                    {p.destacada && (
                      <span className="ml-2 rounded-full bg-pf-blue-soft px-2 py-0.5 text-[10px] font-bold uppercase text-pf-blue">
                        destacada
                      </span>
                    )}
                    {!p.precio_publico && (
                      <span className="ml-2 rounded-full bg-line-soft px-2 py-0.5 text-[10px] font-bold uppercase text-ink-faint">
                        precio oculto
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize text-ink-soft">
                    {p.operacion} · {p.tipo}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink">{precio ?? '—'}</td>
                  <td className="px-4 py-3">
                    <BadgeEstado estado={p.estado} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{nFotos}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-ink-faint">
        Tocá el código o el título para editar la propiedad, cambiar sus fotos o eliminarla.
      </p>
    </>
  )
}
