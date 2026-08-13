'use client'

import { useActionState } from 'react'
import { iniciarSesion, type EstadoLogin } from './actions'

const estadoInicial: EstadoLogin = { error: null }

export function LoginForm() {
  const [estado, accion, enviando] = useActionState(iniciarSesion, estadoInicial)

  return (
    <form action={accion} className="space-y-4">
      {estado.error && (
        <div className="rounded-md border border-pf-coral/40 bg-pf-coral-soft/50 px-4 py-3 text-sm">
          <p className="font-semibold text-ink">No pudimos iniciar tu sesión</p>
          <p className="mt-0.5 text-ink-soft">{estado.error}</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-ink">
          Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-pf-blue"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-ink">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-pf-blue"
        />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-md bg-pf-blue px-4 py-2.5 font-semibold text-surface transition-colors hover:bg-pf-navy disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? 'Entrando…' : 'Entrar al panel'}
      </button>
    </form>
  )
}
