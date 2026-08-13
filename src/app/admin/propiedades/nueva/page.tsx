import Link from 'next/link'
import { PropertyForm } from './PropertyForm'

export default function NuevaPropiedad() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin"
        className="text-sm font-semibold text-ink-soft transition-colors hover:text-pf-blue"
      >
        ← Volver al listado
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-pf-navy">Nueva propiedad</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Solo código y título son obligatorios — el resto se puede completar después. Lo que quede
        en “disponible” aparece en la web al toque.
      </p>
      <div className="mt-6">
        <PropertyForm />
      </div>
    </div>
  )
}
