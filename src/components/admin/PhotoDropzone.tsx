'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/*
  Arrastrar y soltar SIN librerías: los eventos dragover/drop del navegador
  alcanzan y son explicables línea por línea. La primera foto es la portada.
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
  fotos,
  onChange,
  deshabilitado,
}: {
  fotos: FotoElegida[]
  onChange: (fotos: FotoElegida[]) => void
  deshabilitado?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [rechazadas, setRechazadas] = useState<string[]>([])

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
      if (nuevas.length > 0) onChange([...fotos, ...nuevas])
    },
    [fotos, onChange]
  )

  const quitar = (i: number) => {
    URL.revokeObjectURL(fotos[i].preview)
    onChange(fotos.filter((_, j) => j !== i))
  }

  // Liberar las previews al desmontar (los object URLs no se limpian solos)
  useEffect(() => {
    return () => fotos.forEach((f) => URL.revokeObjectURL(f.preview))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Agregar fotos"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
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

      {fotos.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {fotos.map((f, i) => (
            <li key={f.preview} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview local (blob:), next/image no aplica */}
              <img
                src={f.preview}
                alt={`Foto ${i + 1} elegida`}
                className="aspect-square w-full rounded-md border border-line-soft object-cover"
              />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-pf-navy/80 px-2 py-0.5 text-[10px] font-bold uppercase text-surface">
                  portada
                </span>
              )}
              <button
                type="button"
                onClick={() => quitar(i)}
                disabled={deshabilitado}
                aria-label={`Quitar foto ${i + 1}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-pf-navy/80 text-xs font-bold text-surface transition-colors hover:bg-pf-coral"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
