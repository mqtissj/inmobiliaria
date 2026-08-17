'use client'

import { useActionState } from 'react'
import { AvisoError } from '@/components/ui/AuthShell'
import { definirContrasena, type EstadoNuevaContrasena } from './actions'

const estadoInicial: EstadoNuevaContrasena = { error: null }

const claseInput =
  'mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-pf-blue'

export function NuevaContrasenaForm() {
  const [estado, accion, enviando] = useActionState(definirContrasena, estadoInicial)

  return (
    // key = intento: React 19 vacía el form en cada envío. Acá que se vacíe es
    // lo correcto (son contraseñas), pero el remonte permite volver a enfocar.
    <form key={estado.intento ?? 0} action={accion} className="space-y-4">
      {estado.error && (
        <AvisoError titulo="No pudimos cambiar la contraseña">{estado.error}</AvisoError>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-ink">
          Contraseña nueva
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
          className={claseInput}
        />
        <p className="mt-1 text-xs text-ink-faint">
          Mínimo 8 caracteres. Anotala en algún lado antes de seguir.
        </p>
      </div>

      <div>
        <label htmlFor="password_repetida" className="block text-sm font-semibold text-ink">
          Repetila
        </label>
        <input
          id="password_repetida"
          name="password_repetida"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={claseInput}
        />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-md bg-pf-blue px-4 py-2.5 font-semibold text-surface transition-colors hover:bg-pf-navy disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? 'Guardando…' : 'Guardar y entrar al panel'}
      </button>
    </form>
  )
}
