'use client'

import { useCallback, useRef, useState } from 'react'

/*
  Arrastrar y soltar SIN librerías: los eventos dragover/drop del navegador
  alcanzan y son explicables línea por línea. Solo ELIGE fotos: el orden, la
  portada y las miniaturas los maneja GaleriaFotos, junto con las ya publicadas.
  Valida acá lo mismo que exige el bucket (5 MB, solo imágenes) para avisar
  ANTES de subir, no después.
*/
const MAX_MB = 5
const TIPOS_OK = ['image/jpeg', 'image/png', 'image/webp']

export interface FotoElegida {
  file: File
  preview: string
}

export function PhotoDropzone({
  onAgregar,
  deshabilitado,
}: {
  onAgregar: (nuevas: FotoElegida[]) => void
  deshabilitado?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [rechazadas, setRechazadas] = useState<string[]>([])

  /*
    Los object URLs de las previews NO se liberan acá.
    Los libera PropertyForm, que es quien tiene la lista: este componente se
    desmonta y se vuelve a montar cada vez que un intento de guardado falla (el
    <form> se remonta por `key`), y si la limpieza viviera acá, cada error
    dejaría las miniaturas rotas con las fotos todavía elegidas.
  */
  const agregar = useCallback(
    (lista: FileList | null) => {
      if (!lista) return
      const nuevas: FotoElegida[] = []
      const malas: string[] = []
      for (const file of Array.from(lista)) {
        if (!TIPOS_OK.includes(file.type)) {
          malas.push(`${file.name}: tiene que ser JPG, PNG o WebP`)
        } else if (file.size > MAX_MB * 1024 * 1024) {
          malas.push(`${file.name}: pesa más de ${MAX_MB} MB — bajale la calidad o sacala de nuevo`)
        } else {
          nuevas.push({ file, preview: URL.createObjectURL(file) })
        }
      }
      setRechazadas(malas)
      if (nuevas.length > 0) onAgregar(nuevas)
    },
    [onAgregar]
  )

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Agregar fotos"
        onClick={() => inputRef.current?.click()}
        // Un <div role="button"> NO sintetiza el clic desde el teclado — eso lo
        // hace solo un <button> de verdad. Y la barra espaciadora es la tecla
        // que la mayoría prueba primero. Sin esto, quien navega con teclado no
        // puede subir fotos. preventDefault en el espacio: si no, la página
        // scrollea abajo del formulario mientras se abre el explorador.
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastrando(false)
          if (!deshabilitado) agregar(e.dataTransfer.files)
        }}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          arrastrando ? 'border-pf-blue bg-pf-blue-soft' : 'border-line bg-paper hover:border-pf-blue'
        } ${deshabilitado ? 'pointer-events-none opacity-60' : ''}`}
      >
        <p className="font-semibold text-ink">Arrastrá las fotos acá</p>
        <p className="mt-1 text-sm text-ink-soft">
          o hacé clic para elegirlas · JPG, PNG o WebP, hasta {MAX_MB} MB cada una
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={TIPOS_OK.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            agregar(e.target.files)
            e.target.value = '' // permite volver a elegir el mismo archivo
          }}
        />
      </div>

      {rechazadas.length > 0 && (
        <div className="mt-3 rounded-md border border-pf-coral/40 bg-pf-coral-soft/50 px-4 py-3 text-sm">
          <p className="font-semibold text-ink">Estas fotos no entraron (el resto sí):</p>
          <ul className="mt-1 list-inside list-disc text-ink-soft">
            {rechazadas.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
