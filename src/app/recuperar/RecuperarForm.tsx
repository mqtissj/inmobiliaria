'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { AvisoError } from '@/components/ui/AuthShell'
import { pedirRecuperacion, type EstadoRecuperar } from './actions'

const estadoInicial: EstadoRecuperar = { error: null }

export function RecuperarForm() {
  const [estado, accion, enviando] = useActionState(pedirRecuperacion, estadoInicial)

  // Salió bien: no mostramos el formulario de nuevo, mostramos qué hacer ahora.
  if (estado.enviado) {
    return (
      <div className="text-sm">
        <p className="font-semibold text-ink">Listo, revisá tu correo</p>
        <p className="mt-1 text-ink-soft">
          Si <span className="font-semibold text-ink">{estado.email}</span> es la dirección del
          panel, te llega un mail con el link para poner una contraseña nueva. Puede tardar un par
          de minutos, y a veces cae en correo no deseado.
        </p>
        <p className="mt-3 rounded-md border border-line-soft bg-paper px-3 py-2 text-ink-soft">
          <span className="font-semibold text-ink">Importante:</span> abrí el link en{' '}
          <span className="font-semibold text-ink">este mismo navegador</span>. Si lo abrís en el
          celular habiéndolo pedido acá, el link no va a funcionar.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block font-semibold text-pf-blue hover:underline"
        >
          ← Volver a entrar
        </Link>
      </div>
    )
  }

  return (
    // key = intento: React 19 vacía el form en cada envío (ver ./actions)
    <form key={estado.intento ?? 0} action={accion} className="space-y-4">
      {estado.error && <AvisoError titulo="No pudimos mandar el mail">{estado.error}</AvisoError>}

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-ink">
          Mail del panel
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          defaultValue={estado.email}
          className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-pf-blue"
        />
        <p className="mt-1 text-xs text-ink-faint">
          El mismo con el que entrás al panel. Te mandamos un link para definir una contraseña
          nueva.
        </p>
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-md bg-pf-blue px-4 py-2.5 font-semibold text-surface transition-colors hover:bg-pf-navy disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? 'Mandando…' : 'Mandarme el link'}
      </button>

      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-pf-blue hover:underline">
          Volver a entrar
        </Link>
      </p>
    </form>
  )
}
