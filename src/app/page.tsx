import { supabase } from '@/lib/supabase'

export const revalidate = 60

export default async function Home() {
  const { data: propiedades, error } = await supabase
    .from('propiedades')
    .select('codigo, titulo, operacion, tipo, ciudad, barrio, precio, moneda, precio_publico, dormitorios')
    .eq('estado', 'disponible')
    .order('destacada', { ascending: false })

  if (error) {
    return <pre className="p-8 text-red-600">Error: {error.message}</pre>
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold mb-6">Propiedades</h1>
      <div className="grid gap-4">
        {propiedades?.map((p) => (
          <article key={p.codigo} className="rounded-lg border p-5">
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              {p.codigo} · {p.operacion} · {p.tipo}
            </div>
            <h2 className="mt-1 text-lg font-semibold">{p.titulo}</h2>
            <p className="text-sm text-neutral-600">
              {p.barrio ? `${p.barrio}, ` : ''}{p.ciudad}
              {p.dormitorios ? ` · ${p.dormitorios} dorm.` : ''}
            </p>
            <p className="mt-2 font-medium">
              {p.precio_publico && p.precio
                ? `${p.moneda} ${Number(p.precio).toLocaleString('es-UY')}`
                : 'Precio a consultar'}
            </p>
          </article>
        ))}
      </div>
    </main>
  )
}
