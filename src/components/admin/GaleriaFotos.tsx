'use client'

import { useRef } from 'react'
import Image from 'next/image'
import type { PropiedadFoto } from '@/lib/types'
import type { FotoElegida } from './PhotoDropzone'

/*
  Las fotos de una propiedad EN EL ORDEN EN QUE SALEN EN LA WEB: la primera es
  la portada. Mezcla las ya publicadas con las recién elegidas, así una placa
  nueva se puede poner de portada antes de guardar.

  POR QUÉ EXISTE (16/9/2026): cuando cambiaba un precio, la placa nueva con el
  precio nuevo se agregaba ÚLTIMA y sin marca de portada. La única forma de
  dejarla primera era borrar todas las fotos y volver a subirlas en orden.

  Flechas y no arrastrar: el panel se usa desde el celular, y arrastrar con el
  dedo en una grilla pelea con el scroll de la página. Lo que más se usa es
  cambiar la portada, y para eso alcanza un botón.
*/
export type FotoEnGaleria = { publicada: PropiedadFoto } | { nueva: FotoElegida }

const claseFlecha =
  'flex h-9 flex-1 items-center justify-center rounded-md border border-line bg-surface text-base font-semibold text-ink-soft transition-colors hover:border-pf-blue hover:text-pf-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft'

export function GaleriaFotos({
  fotos,
  onMover,
  onQuitar,
  deshabilitado,
}: {
  fotos: FotoEnGaleria[]
  onMover: (desde: number, hasta: number) => void
  onQuitar: (foto: FotoEnGaleria) => void
  deshabilitado?: boolean
}) {
  const lista = useRef<HTMLUListElement>(null)
  // Si todas son nuevas (el alta), marcarlas "sin guardar" no le dice nada a nadie
  const hayPublicadas = fotos.some((f) => 'publicada' in f)

  const hacerPortada = (i: number) => {
    onMover(i, 0)
    // En el celular la grilla es más alta que la pantalla: la foto se va arriba
    // de todo y, sin esto, desaparece de abajo del dedo como si se hubiera
    // borrado. Solo se scrollea si el principio de la grilla quedó fuera de vista.
    const ul = lista.current
    if (ul && ul.getBoundingClientRect().top < 0) {
      const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ul.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' })
    }
  }

  return (
    <ul ref={lista} className="grid scroll-mt-4 grid-cols-2 gap-3 sm:grid-cols-4">
      {fotos.map((f, i) => {
        const numero = i + 1
        const esNueva = 'nueva' in f
        return (
          <li key={esNueva ? f.nueva.preview : f.publicada.id}>
            <div className="relative">
              {esNueva ? (
                // eslint-disable-next-line @next/next/no-img-element -- preview local (blob:), next/image no aplica
                <img
                  src={f.nueva.preview}
                  alt={`Foto ${numero}`}
                  className="aspect-square w-full rounded-md border border-line-soft object-cover"
                />
              ) : (
                <Image
                  src={f.publicada.url}
                  alt={`Foto ${numero}`}
                  // 240 y no menos: en la placa hay que poder leer el precio para
                  // distinguir la vieja de la nueva.
                  width={240}
                  height={240}
                  className="aspect-square w-full rounded-md border border-line-soft object-cover"
                />
              )}
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-pf-navy/80 px-2 py-0.5 text-[10px] font-bold uppercase text-surface">
                  portada
                </span>
              )}
              {esNueva && hayPublicadas && (
                <span className="absolute bottom-1 left-1 rounded-full bg-pf-teal px-2 py-0.5 text-[10px] font-bold uppercase text-surface">
                  sin guardar
                </span>
              )}
              <button
                type="button"
                onClick={() => onQuitar(f)}
                disabled={deshabilitado}
                aria-label={esNueva ? `Quitar la foto ${numero}` : `Borrar la foto ${numero} de la web`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-pf-navy/80 text-xs font-bold text-surface transition-colors hover:bg-pf-coral"
              >
                ×
              </button>
            </div>

            <div className="mt-1.5 flex gap-1.5">
              <button
                type="button"
                onClick={() => onMover(i, i - 1)}
                disabled={deshabilitado || i === 0}
                aria-label={`Mover la foto ${numero} un lugar antes`}
                className={claseFlecha}
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => onMover(i, i + 1)}
                disabled={deshabilitado || i === fotos.length - 1}
                aria-label={`Mover la foto ${numero} un lugar después`}
                className={claseFlecha}
              >
                →
              </button>
            </div>
            {i === 0 ? (
              <p className="mt-1.5 flex h-9 items-center justify-center text-xs font-semibold text-ink-faint">
                Es la portada
              </p>
            ) : (
              <button
                type="button"
                onClick={() => hacerPortada(i)}
                disabled={deshabilitado}
                className="mt-1.5 h-9 w-full rounded-md bg-pf-blue-soft text-xs font-semibold text-pf-blue transition-colors hover:bg-pf-blue hover:text-surface disabled:cursor-not-allowed disabled:opacity-40"
              >
                Hacer portada
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
