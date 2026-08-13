import Link from 'next/link'

// 404 con salida: qué pasó + a dónde ir (REGLAS: ningún error deja a la persona sin nada que hacer)
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-5xl font-semibold text-pf-navy">404</p>
      <h1 className="mt-3 font-display text-xl font-semibold text-ink">
        Esa página no existe — o la propiedad ya no está publicada
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Puede que el link haya llegado cortado, o que la propiedad se haya vendido o retirado.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-pf-blue px-5 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-pf-navy"
      >
        Ver las propiedades disponibles
      </Link>
    </div>
  )
}
