import Link from 'next/link'
import { CARACTERISTICAS, etiquetaCaracteristica } from '@/lib/types'
import { DormitoriosSelect } from './DormitoriosSelect'

/*
  Filtros de la home. Reemplaza a los chips sueltos de antes: el cliente pidió
  (17/8) una lista larga —baños, exterior, cochera, comodidades, mascotas— y
  veinticinco chips en una sola fila no se pueden usar, menos en un celular.

  ESTRUCTURA:
   - Arriba, siempre visible, lo que la gente filtra primero: operación, tipo,
     dormitorios. Más el botón de propietarios, que NO es un filtro (no filtra
     nada: lleva al formulario de /contacto) y por eso se ve distinto.
   - Abajo, un desplegable "Más filtros" con el resto, agrupado con los mismos
     títulos que usó el cliente.

  CERO JAVASCRIPT, otra vez: los chips son links y el desplegable es un
  <details> nativo, igual que el acordeón de las FAQs. La única excepción sigue
  siendo el select de dormitorios.

  El truco del <details>: cada clic navega y volvería a renderizar cerrado,
  dejando al usuario perdido. Por eso `open` se calcula en el servidor y queda
  abierto mientras haya algún subfiltro puesto.

  Los chips se derivan de los datos, como todo el resto del sitio: si ninguna
  propiedad tiene parrillero, no hay chip de parrillero. Así nunca se ofrece un
  filtro que devuelve vacío. Se llenan solos a medida que el panel carga datos.
*/
export interface EstadoFiltros {
  operacion?: string
  tipo?: string
  dormitorios?: number
  banos?: number
  patio?: string
  caracteristicas: string[]
  garaje: boolean
  mascotas?: 'si' | 'no'
  ideal?: string
}

export interface DisponiblesFiltros {
  tipos: string[]
  dormitoriosMax: number
  banosMax: number
  hayTraspasos: boolean
  patios: string[]
  caracteristicas: string[]
  hayGaraje: boolean
  hayMascotasSi: boolean
  hayMascotasNo: boolean
  ideales: string[]
}

/** Un grupo del desplegable: título chico arriba, chips abajo. */
function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{titulo}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function FilterPanel({
  actual,
  disponibles,
}: {
  actual: EstadoFiltros
  disponibles: DisponiblesFiltros
}) {
  // Cada chip declara el estado COMPLETO al que lleva; lo que no se pasa, se apaga.
  const href = (destino: EstadoFiltros) => {
    const p = new URLSearchParams()
    if (destino.operacion) p.set('operacion', destino.operacion)
    if (destino.tipo) p.set('tipo', destino.tipo)
    if (destino.dormitorios) p.set('dormitorios', String(destino.dormitorios))
    if (destino.banos) p.set('banos', String(destino.banos))
    if (destino.patio) p.set('patio', destino.patio)
    if (destino.caracteristicas.length > 0) p.set('caract', destino.caracteristicas.join(','))
    if (destino.garaje) p.set('garaje', 'si')
    if (destino.mascotas) p.set('mascotas', destino.mascotas)
    if (destino.ideal) p.set('ideal', destino.ideal)
    const qs = p.toString()
    return qs ? `/?${qs}` : '/'
  }

  // Marcar y desmarcar una característica sin tocar las otras
  const conCaracteristica = (valor: string): EstadoFiltros => ({
    ...actual,
    caracteristicas: actual.caracteristicas.includes(valor)
      ? actual.caracteristicas.filter((c) => c !== valor)
      : [...actual.caracteristicas, valor],
  })

  const chip = (activo: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
      activo
        ? 'bg-pf-blue text-surface'
        : 'border border-line bg-surface text-ink-soft hover:border-pf-blue hover:text-pf-blue'
    }`

  const separador = <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />

  // Qué grupos del desplegable tienen algo para ofrecer
  const grupos = [
    {
      titulo: 'Baños',
      hay: disponibles.banosMax > 0 || disponibles.caracteristicas.includes('bano_completo'),
    },
    {
      titulo: 'Exterior',
      hay:
        disponibles.patios.length > 0 ||
        CARACTERISTICAS.Exterior.some((c) => disponibles.caracteristicas.includes(c.valor)),
    },
    { titulo: 'Cochera', hay: disponibles.hayGaraje || disponibles.caracteristicas.includes('cochera') },
    {
      titulo: 'Comodidades',
      hay: CARACTERISTICAS.Comodidades.some((c) => disponibles.caracteristicas.includes(c.valor)),
    },
    { titulo: 'Mascotas', hay: disponibles.hayMascotasSi || disponibles.hayMascotasNo },
    // "Ideal para" vive adentro del desplegable igual que los otros, así que
    // tiene que contar para decidir si el desplegable existe. Si faltara y lo
    // ÚNICO cargado fuera ideal_para, sus chips no se renderizarían nunca.
    { titulo: 'Ideal para', hay: disponibles.ideales.length > 0 },
  ]
  const hayDesplegable = grupos.some((g) => g.hay)

  /*
    Abierto si hay algo puesto ahí adentro: si no, cada clic lo cerraría.
    `ideal` va en la lista y ANTES faltaba — con ?ideal=familia el panel salía
    cerrado mientras el filtro estaba aplicando, así que el único chip capaz de
    apagarlo quedaba escondido. Y peor: si apagabas otro subfiltro, el panel se
    cerraba solo con "para familia" todavía filtrando.
    Regla para el que agregue un subfiltro nuevo: si el chip vive adentro del
    <details>, su estado va acá.
  */
  const abierto =
    actual.banos != null ||
    actual.patio != null ||
    actual.caracteristicas.length > 0 ||
    actual.garaje ||
    actual.mascotas != null ||
    actual.ideal != null

  return (
    <div className="space-y-3">
      {/* ---------- Fila principal ---------- */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={href({ ...actual, operacion: undefined })} className={chip(!actual.operacion)}>
          Todas
        </Link>
        <Link
          href={href({ ...actual, operacion: 'venta' })}
          className={chip(actual.operacion === 'venta')}
        >
          Comprar
        </Link>
        <Link
          href={href({ ...actual, operacion: 'alquiler' })}
          className={chip(actual.operacion === 'alquiler')}
        >
          Alquilar
        </Link>
        {disponibles.hayTraspasos && (
          <Link
            href={href({ ...actual, operacion: 'traspaso' })}
            className={chip(actual.operacion === 'traspaso')}
          >
            Traspaso
          </Link>
        )}

        {disponibles.tipos.length > 1 && (
          <>
            {separador}
            {disponibles.tipos.map((t) => (
              <Link
                key={t}
                href={href({ ...actual, tipo: actual.tipo === t ? undefined : t })}
                className={chip(actual.tipo === t)}
              >
                {t === 'local' ? 'Local comercial' : t.charAt(0).toUpperCase() + t.slice(1)}
              </Link>
            ))}
          </>
        )}

        {disponibles.dormitoriosMax > 0 && (
          <>
            {separador}
            <DormitoriosSelect
              activo={actual.dormitorios != null}
              seleccionada={href(actual)}
              opciones={[
                { etiqueta: 'Dormitorios: todos', href: href({ ...actual, dormitorios: undefined }) },
                ...Array.from({ length: disponibles.dormitoriosMax }, (_, i) => i + 1).map((d) => ({
                  etiqueta: `${d} ${d === 1 ? 'dormitorio' : 'dormitorios'}`,
                  href: href({ ...actual, dormitorios: d }),
                })),
              ]}
            />
          </>
        )}

        {/* NO es un filtro: es la puerta al formulario de propietarios. Se ve
            distinto (borde punteado, sin relleno) justamente para que nadie
            espere que filtre el listado. */}
        <Link
          href="/contacto#propietarios"
          className="ml-auto rounded-full border border-dashed border-pf-blue/60 px-4 py-1.5 text-sm font-semibold text-pf-blue transition-colors hover:bg-pf-blue-soft"
        >
          Soy propietario ↗
        </Link>
      </div>

      {/* ---------- Desplegable con el resto ---------- */}
      {hayDesplegable && (
        <details open={abierto} className="group rounded-lg border border-line-soft bg-paper">
          <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-semibold text-ink-soft marker:content-none hover:text-pf-blue">
            Más filtros
            <span className="ml-1 text-ink-faint group-open:hidden">▾</span>
            <span className="ml-1 hidden text-ink-faint group-open:inline">▴</span>
          </summary>

          <div className="space-y-4 border-t border-line-soft px-4 py-4">
            {grupos[0].hay && (
              <Grupo titulo="Baños">
                {Array.from({ length: disponibles.banosMax }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={href({ ...actual, banos: actual.banos === n ? undefined : n })}
                    className={chip(actual.banos === n)}
                  >
                    {n} {n === 1 ? 'baño' : 'baños'}
                  </Link>
                ))}
                {disponibles.caracteristicas.includes('bano_completo') && (
                  <Link
                    href={href(conCaracteristica('bano_completo'))}
                    className={chip(actual.caracteristicas.includes('bano_completo'))}
                  >
                    Baño completo
                  </Link>
                )}
              </Grupo>
            )}

            {grupos[1].hay && (
              <Grupo titulo="Exterior">
                {disponibles.patios.map((t) => (
                  <Link
                    key={t}
                    href={href({ ...actual, patio: actual.patio === t ? undefined : t })}
                    className={chip(actual.patio === t)}
                  >
                    Patio {t}
                  </Link>
                ))}
                {CARACTERISTICAS.Exterior.filter((c) =>
                  disponibles.caracteristicas.includes(c.valor)
                ).map((c) => (
                  <Link
                    key={c.valor}
                    href={href(conCaracteristica(c.valor))}
                    className={chip(actual.caracteristicas.includes(c.valor))}
                  >
                    {c.etiqueta}
                  </Link>
                ))}
              </Grupo>
            )}

            {grupos[2].hay && (
              <Grupo titulo="Cochera">
                {disponibles.caracteristicas.includes('cochera') && (
                  <Link
                    href={href(conCaracteristica('cochera'))}
                    className={chip(actual.caracteristicas.includes('cochera'))}
                  >
                    Cochera
                  </Link>
                )}
                {disponibles.hayGaraje && (
                  <Link
                    href={href({ ...actual, garaje: !actual.garaje })}
                    className={chip(actual.garaje)}
                  >
                    Garaje
                  </Link>
                )}
              </Grupo>
            )}

            {grupos[3].hay && (
              <Grupo titulo="Comodidades">
                {CARACTERISTICAS.Comodidades.filter((c) =>
                  disponibles.caracteristicas.includes(c.valor)
                ).map((c) => (
                  <Link
                    key={c.valor}
                    href={href(conCaracteristica(c.valor))}
                    className={chip(actual.caracteristicas.includes(c.valor))}
                  >
                    {c.etiqueta}
                  </Link>
                ))}
              </Grupo>
            )}

            {grupos[4].hay && (
              <Grupo titulo="Mascotas">
                {disponibles.hayMascotasSi && (
                  <Link
                    href={href({ ...actual, mascotas: actual.mascotas === 'si' ? undefined : 'si' })}
                    className={chip(actual.mascotas === 'si')}
                  >
                    Se aceptan mascotas
                  </Link>
                )}
                {disponibles.hayMascotasNo && (
                  <Link
                    href={href({ ...actual, mascotas: actual.mascotas === 'no' ? undefined : 'no' })}
                    className={chip(actual.mascotas === 'no')}
                  >
                    No se aceptan
                  </Link>
                )}
              </Grupo>
            )}

            {grupos[5].hay && (
              <Grupo titulo="Ideal para">
                {disponibles.ideales.map((v) => (
                  <Link
                    key={v}
                    href={href({ ...actual, ideal: actual.ideal === v ? undefined : v })}
                    className={chip(actual.ideal === v)}
                  >
                    Para {v}
                  </Link>
                ))}
              </Grupo>
            )}
          </div>
        </details>
      )}
    </div>
  )
}

/** Resumen en palabras de lo filtrado, para el contador del listado. */
export function resumenFiltros(actual: EstadoFiltros): string {
  const partes: string[] = []
  if (actual.operacion) partes.push(`en ${actual.operacion}`)
  if (actual.tipo) partes.push(actual.tipo)
  if (actual.dormitorios)
    partes.push(`${actual.dormitorios} ${actual.dormitorios === 1 ? 'dormitorio' : 'dormitorios'}`)
  if (actual.banos) partes.push(`${actual.banos} ${actual.banos === 1 ? 'baño' : 'baños'}`)
  if (actual.patio) partes.push(`patio ${actual.patio}`)
  if (actual.garaje) partes.push('garaje')
  for (const c of actual.caracteristicas) partes.push(etiquetaCaracteristica(c).toLowerCase())
  if (actual.ideal) partes.push(`para ${actual.ideal}`)
  if (actual.mascotas === 'si') partes.push('aceptan mascotas')
  if (actual.mascotas === 'no') partes.push('no aceptan mascotas')
  return partes.length > 0 ? ` · ${partes.join(' · ')}` : ''
}
