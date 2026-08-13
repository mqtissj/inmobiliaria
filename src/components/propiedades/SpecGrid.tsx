import { esRural } from '@/lib/types'
import type { Propiedad } from '@/lib/types'

/*
  Ficha técnica condicional: un campo muestra hectáreas/CONEAT/agua,
  una casa muestra dormitorios/m². Lo que está en null no se muestra —
  jamás un "0 dormitorios" en un campo ganadero (CLAUDE.md §5).
*/
function filas(p: Propiedad): { etiqueta: string; valor: string }[] {
  const si = (v: boolean | null) => (v ? 'Sí' : 'No')
  const out: { etiqueta: string; valor: string }[] = []

  if (esRural(p.tipo)) {
    if (p.hectareas != null)
      out.push({ etiqueta: 'Superficie', valor: `${Number(p.hectareas).toLocaleString('es-UY')} há` })
    if (p.indice_coneat != null) out.push({ etiqueta: 'Índice CONEAT', valor: String(p.indice_coneat) })
    if (p.tiene_agua != null) out.push({ etiqueta: 'Agua', valor: si(p.tiene_agua) })
    if (p.tiene_luz != null) out.push({ etiqueta: 'Luz', valor: si(p.tiene_luz) })
    if (p.alambrado != null) out.push({ etiqueta: 'Alambrado', valor: si(p.alambrado) })
    if (p.padron) out.push({ etiqueta: 'Padrón', valor: p.padron })
  } else {
    if (p.dormitorios != null) out.push({ etiqueta: 'Dormitorios', valor: String(p.dormitorios) })
    if (p.banos != null) out.push({ etiqueta: 'Baños', valor: String(p.banos) })
    if (p.m2_edificados != null) out.push({ etiqueta: 'M² edificados', valor: `${p.m2_edificados} m²` })
    if (p.m2_terreno != null) out.push({ etiqueta: 'M² de terreno', valor: `${p.m2_terreno} m²` })
    if (p.plantas != null) out.push({ etiqueta: 'Plantas', valor: String(p.plantas) })
    if (p.garage != null) out.push({ etiqueta: 'Garaje', valor: si(p.garage) })
  }

  // comunes a todo
  if (p.gastos_comunes != null)
    out.push({
      etiqueta: 'Gastos comunes',
      valor: `$U ${Number(p.gastos_comunes).toLocaleString('es-UY')}`,
    })
  if (p.operacion === 'alquiler' && p.requiere_garantia != null) {
    out.push({
      etiqueta: 'Garantía',
      valor: p.requiere_garantia
        ? Array.isArray(p.tipos_garantia) && p.tipos_garantia.length > 0
          ? p.tipos_garantia.join(' / ')
          : 'Requiere (consultá cuáles acepta el propietario)'
        : 'No requiere',
    })
  }
  if (p.operacion === 'alquiler' && p.acepta_mascotas != null)
    out.push({ etiqueta: 'Mascotas', valor: si(p.acepta_mascotas) })

  return out
}

export function SpecGrid({ propiedad }: { propiedad: Propiedad }) {
  const items = filas(propiedad)
  if (items.length === 0) return null

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line-soft py-5 sm:grid-cols-3">
      {items.map((f) => (
        <div key={f.etiqueta}>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            {f.etiqueta}
          </dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-ink">{f.valor}</dd>
        </div>
      ))}
    </dl>
  )
}
