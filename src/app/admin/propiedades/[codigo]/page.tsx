import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import type { Propiedad, PropiedadFoto } from '@/lib/types'
import { PropertyForm } from '../nueva/PropertyForm'
import { BotonEliminar } from './BotonEliminar'

/*
  Edición: misma pantalla que el alta, precargada. Lee la TABLA con la sesión
  del usuario (RLS de authenticated) — por eso acá sí se ve el precio real
  de una propiedad con precio oculto.
*/
export default async function EditarPropiedad(props: PageProps<'/admin/propiedades/[codigo]'>) {
  const { codigo } = await props.params
  const supabase = await supabaseServer()

  const { data } = await supabase
    .from('propiedades')
    .select('*')
    .ilike('codigo', decodeURIComponent(codigo))
    .maybeSingle()

  if (!data) notFound()
  const propiedad = data as Propiedad

  const { data: fotos } = await supabase
    .from('propiedad_fotos')
    .select('*')
    .eq('propiedad_id', propiedad.id)
    .order('es_portada', { ascending: false })
    .order('orden', { ascending: true })

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin"
        className="text-sm font-semibold text-ink-soft transition-colors hover:text-pf-blue"
      >
        ← Volver al listado
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-pf-navy">
          Editar {propiedad.codigo}
        </h1>
        <a
          href={`/propiedades/${propiedad.codigo.toLowerCase()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-pf-blue hover:underline"
        >
          Ver cómo se ve en la web ↗
        </a>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Los cambios se publican al guardar. Las fotos que borres se sacan de la web al instante.
      </p>

      <div className="mt-6">
        <PropertyForm propiedad={propiedad} fotosExistentes={(fotos ?? []) as PropiedadFoto[]} />
      </div>

      <div className="mt-10 rounded-lg border border-pf-coral/30 bg-pf-coral-soft/30 p-5">
        <h2 className="font-semibold text-ink">Zona peligrosa</h2>
        <p className="mb-3 mt-1 text-sm text-ink-soft">
          Si la operación se cayó o se cargó mal, se puede eliminar del todo. Si solo se vendió o
          alquiló, mejor cambiale el estado arriba — deja de publicarse pero queda el registro.
        </p>
        <BotonEliminar id={propiedad.id} codigo={propiedad.codigo} titulo={propiedad.titulo} />
      </div>
    </div>
  )
}
