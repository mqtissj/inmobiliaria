'use client'

import { useRef } from 'react'
import { eliminarPropiedad } from '../actions'

// El confirm() nativo alcanza: una pregunta clara antes de algo irreversible.
// Sin librería de modales para un solo caso de uso.
export function BotonEliminar({ id, codigo, titulo }: { id: string; codigo: string; titulo: string }) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      action={eliminarPropiedad}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `¿Eliminar ${codigo} (“${titulo}”)?\n\nSe borra de la web, del panel y sus fotos del almacenamiento. No se puede deshacer.`
          )
        ) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="codigo" value={codigo} />
      <button
        type="submit"
        className="rounded-md border border-pf-coral/50 px-4 py-2 text-sm font-semibold text-pf-coral transition-colors hover:bg-pf-coral hover:text-surface"
      >
        Eliminar esta propiedad
      </button>
    </form>
  )
}
