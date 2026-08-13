'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import type { PropiedadFoto } from '@/lib/types'

/*
  Galería + lightbox sin librerías. La grilla muestra portada + 3 miniaturas;
  si hay más, la última miniatura tapa con "+N". Cualquier foto abre el
  visor a pantalla completa: ← → navegan, Esc cierra, el fondo también.
  Los overlays respetan prefers-reduced-motion (transición solo de opacidad,
  y ninguna si el sistema pide menos movimiento).
*/
export function GalleryLightbox({ fotos, titulo }: { fotos: PropiedadFoto[]; titulo: string }) {
  const [abierta, setAbierta] = useState<number | null>(null)

  const cerrar = useCallback(() => setAbierta(null), [])
  const mover = useCallback(
    (delta: number) => {
      setAbierta((i) => (i === null ? null : (i + delta + fotos.length) % fotos.length))
    },
    [fotos.length]
  )

  // Teclado + bloquear el scroll del fondo mientras el visor está abierto
  useEffect(() => {
    if (abierta === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar()
      if (e.key === 'ArrowRight') mover(1)
      if (e.key === 'ArrowLeft') mover(-1)
    }
    document.addEventListener('keydown', onKey)
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflowPrevio
    }
  }, [abierta, cerrar, mover])

  const miniaturas = fotos.slice(1, 4)
  const restantes = fotos.length - 4

  return (
    <>
      <div className={`grid gap-2 ${fotos.length > 1 ? 'sm:grid-cols-[2fr_1fr]' : ''}`}>
        <button
          type="button"
          onClick={() => setAbierta(0)}
          className="group relative aspect-[16/10] cursor-zoom-in overflow-hidden rounded-lg"
          aria-label={`Ver las ${fotos.length} fotos de ${titulo}`}
        >
          <Image
            src={fotos[0].url}
            alt={`Foto principal de ${titulo}`}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 66vw"
            className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
          />
        </button>

        {miniaturas.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
            {miniaturas.map((f, i) => {
              const esUltima = i === miniaturas.length - 1 && restantes > 0
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAbierta(i + 1)}
                  className="relative aspect-[16/10] cursor-zoom-in overflow-hidden rounded-lg"
                  aria-label={esUltima ? `Ver las ${fotos.length} fotos` : `Ver foto ${i + 2} de ${titulo}`}
                >
                  <Image
                    src={f.url}
                    alt={`Foto ${i + 2} de ${titulo}`}
                    fill
                    sizes="(max-width: 640px) 33vw, 22vw"
                    className="object-cover"
                  />
                  {esUltima && (
                    <span className="absolute inset-0 flex items-center justify-center bg-pf-navy/60 font-display text-lg font-semibold text-surface">
                      +{restantes} fotos
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {abierta !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Fotos de ${titulo}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-pf-navy/95 motion-safe:animate-[aparecer_0.15s_ease]"
          onClick={cerrar}
        >
          {/* stopPropagation: el clic en la foto o los controles no cierra */}
          <div className="relative h-full w-full max-w-5xl p-4 sm:p-10" onClick={(e) => e.stopPropagation()}>
            <Image
              src={fotos[abierta].url}
              alt={`Foto ${abierta + 1} de ${titulo}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar las fotos"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-surface/10 text-xl text-surface transition-colors hover:bg-surface/25"
          >
            ×
          </button>

          {fotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  mover(-1)
                }}
                aria-label="Foto anterior"
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/10 text-xl text-surface transition-colors hover:bg-surface/25"
              >
                ←
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  mover(1)
                }}
                aria-label="Foto siguiente"
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/10 text-xl text-surface transition-colors hover:bg-surface/25"
              >
                →
              </button>
            </>
          )}

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-surface/10 px-3 py-1 text-sm tabular-nums text-surface">
            {abierta + 1} / {fotos.length}
          </p>
        </div>
      )}
    </>
  )
}
