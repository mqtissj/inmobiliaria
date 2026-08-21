'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import type { PropiedadFoto } from '@/lib/types'

/*
  Galería + lightbox sin librerías. La grilla muestra la portada grande, dos
  fotos chicas debajo y tres apiladas a la derecha; si hay más, la última tapa
  con "+N". Cualquier foto abre el visor a pantalla completa: ← → navegan, Esc
  cierra, el fondo también. Los overlays respetan prefers-reduced-motion
  (transición solo de opacidad, y ninguna si el sistema pide menos movimiento).
*/

/*
  Una miniatura. Se saca afuera del componente a propósito: definida adentro,
  React la trataría como un tipo nuevo en cada render y remontaría las <img>,
  que es exactamente lo que hace parpadear una galería.
*/
function Miniatura({
  foto,
  indice,
  titulo,
  total,
  restantes,
  esUltima,
  clases,
  onAbrir,
}: {
  foto: PropiedadFoto
  indice: number
  titulo: string
  total: number
  restantes: number
  esUltima: boolean
  clases: string
  onAbrir: (i: number) => void
}) {
  const conBadge = esUltima && restantes > 0
  return (
    <button
      type="button"
      onClick={() => onAbrir(indice)}
      className={`relative cursor-zoom-in overflow-hidden rounded-lg ${clases}`}
      aria-label={conBadge ? `Ver las ${total} fotos` : `Ver foto ${indice + 1} de ${titulo}`}
    >
      <Image
        src={foto.url}
        alt={`Foto ${indice + 1} de ${titulo}`}
        fill
        sizes="(max-width: 640px) 50vw, 22vw"
        className="object-cover"
      />
      {conBadge && (
        <span className="absolute inset-0 flex items-center justify-center bg-pf-navy/60 font-display text-lg font-semibold text-surface">
          +{restantes} fotos
        </span>
      )}
    </button>
  )
}
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

  /*
    Reparto de las fotos:
      fotos[0]    -> la portada, grande
      fotos[1..2] -> dos chicas DEBAJO de la portada
      fotos[3..5] -> tres apiladas a la derecha
    Se ven 6 como máximo; el resto se cuenta en el "+N fotos" de la última.

    POR QUÉ las dos de abajo. La columna derecha son 3 miniaturas a 1/3 del
    ancho, o sea 0,63 × ancho de alto. La portada es 2/3 del ancho en 16/10, o
    sea 0,42 × ancho. Una fila de grid se estira hasta el elemento más alto, así
    que sobraban ~0,2 × ancho (unos 200px) de blanco debajo de la portada en
    cuanto una propiedad tenía 4 fotos o más. Ese hueco ahora lo ocupan estas
    dos, que se estiran con flex-1 para llenar justo lo que sobre, sea cual sea
    el ancho de la pantalla — nada de alturas calculadas a mano.
  */
  const abajo = fotos.slice(1, 3)
  const derecha = fotos.slice(3, 6)
  const restantes = fotos.length - 6
  const indiceUltima = Math.min(fotos.length, 6) - 1

  /*
    Quién fija el alto: la columna IZQUIERDA, siempre, con proporciones fijas.
    Portada en 16/10 más las dos de abajo en 3/2 dan 0,639 × ancho, que es
    casi exactamente lo que miden 3 miniaturas a 1/3 de ancho (0,625 + gaps).
    La diferencia queda en 1 o 2 píxeles a cualquier ancho de pantalla.

    La columna derecha se adapta a ese alto: es flex y sus miniaturas van con
    flex-1, así se reparten lo que haya sean 1, 2 o 3. Eso es lo que hace que
    funcione igual con 4 fotos que con 20, sin ningún caso especial.
    (Lo intenté al revés —alto fijo a la derecha y flex a la izquierda— y con
    exactamente 4 fotos las de abajo colapsaban a cero.)
  */
  return (
    <>
      <div className={`grid gap-2 ${derecha.length > 0 ? 'sm:grid-cols-[2fr_1fr]' : ''}`}>
        <div className="flex flex-col gap-2">
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

          {abajo.length > 0 && (
            <div className={`grid gap-2 ${abajo.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {abajo.map((f, i) => (
                <Miniatura
                  key={f.id}
                  foto={f}
                  indice={i + 1}
                  titulo={titulo}
                  total={fotos.length}
                  restantes={restantes}
                  esUltima={i + 1 === indiceUltima}
                  clases="aspect-[3/2]"
                  onAbrir={setAbierta}
                />
              ))}
            </div>
          )}
        </div>

        {derecha.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-col">
            {derecha.map((f, i) => (
              <Miniatura
                key={f.id}
                foto={f}
                indice={i + 3}
                titulo={titulo}
                total={fotos.length}
                restantes={restantes}
                esUltima={i + 3 === indiceUltima}
                clases="aspect-[16/10] sm:aspect-auto sm:flex-1"
                onAbrir={setAbierta}
              />
            ))}
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
          {/*
            pointer-events-none, no stopPropagation.

            Antes este contenedor frenaba el clic para que tocar la foto no
            cerrara. El problema: mide `h-full w-full max-w-5xl` = 1024px, así
            que en un celular de 375px TAPA TODA LA PANTALLA. No quedaba ni un
            pixel de fondo para tocar, y cerrar era imposible salvo apuntándole
            al × chiquito de la esquina.

            Ahora los clics lo atraviesan y llegan al fondo, que cierra. Tocar
            la foto para salir es lo que hace cualquier galería en el celular.
            Los controles recuperan el clic con pointer-events-auto.
          */}
          <div className="pointer-events-none relative h-full w-full max-w-5xl p-4 sm:p-10">
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
            className="pointer-events-auto absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-surface/10 text-xl text-surface transition-colors hover:bg-surface/25"
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
                className="pointer-events-auto absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/10 text-xl text-surface transition-colors hover:bg-surface/25"
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
                className="pointer-events-auto absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/10 text-xl text-surface transition-colors hover:bg-surface/25"
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
