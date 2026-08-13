import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { linkWhatsApp, resumenSpecs, zonaVisible } from '@/lib/format'
import { getConfig, getFotos, getPropiedadPorCodigo } from '@/lib/queries'
import { BadgeEstado } from '@/components/ui/Badge'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'
import { GalleryLightbox } from '@/components/propiedades/GalleryLightbox'
import { PhotoPlaceholder } from '@/components/propiedades/PhotoPlaceholder'
import { PriceTag } from '@/components/propiedades/PriceTag'
import { SpecGrid } from '@/components/propiedades/SpecGrid'

// La ficha cambia poco: se cachea y se revalida cada 5 minutos, además de
// revalidarse al instante cuando el panel crea o edita (revalidatePath en la action).
export const revalidate = 300

// getPropiedadPorCodigo usa cache() de React: entre generateMetadata y la página
// va UN solo query a la base, no dos.
export async function generateMetadata(
  props: PageProps<'/propiedades/[codigo]'>
): Promise<Metadata> {
  const { codigo } = await props.params
  const p = await getPropiedadPorCodigo(codigo)
  if (!p) return { title: 'Propiedad no encontrada' }

  const descripcion =
    p.descripcion?.slice(0, 155) ??
    `${p.titulo} en ${zonaVisible(p)}. ${resumenSpecs(p)}`.trim()

  const fotos = await getFotos(p.id)

  return {
    title: `${p.titulo} · ${p.codigo}`,
    description: descripcion,
    openGraph: {
      title: `${p.titulo} · ${p.operacion === 'venta' ? 'Venta' : 'Alquiler'}`,
      description: descripcion,
      // Con foto real se usa la portada; sin fotos queda la imagen OG general del sitio
      ...(fotos.length > 0 && { images: [{ url: fotos[0].url }] }),
    },
  }
}

export default async function FichaPropiedad(props: PageProps<'/propiedades/[codigo]'>) {
  const { codigo } = await props.params
  const p = await getPropiedadPorCodigo(codigo)
  if (!p) notFound()

  const [config, fotos] = await Promise.all([getConfig(), getFotos(p.id)])
  const waHref = linkWhatsApp(config.whatsapp, { codigo: p.codigo, titulo: p.titulo })

  return (
    <article className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/"
        className="text-sm font-semibold text-ink-soft transition-colors hover:text-pf-blue"
      >
        ← Todas las propiedades
      </Link>

      {/* Galería con lightbox (todas las fotos, teclado incluido); sin fotos, placeholder propio */}
      <div className="mt-4">
        {fotos.length > 0 ? (
          <GalleryLightbox fotos={fotos} titulo={p.titulo} />
        ) : (
          <PhotoPlaceholder tipo={p.tipo} className="aspect-[16/7] rounded-lg" />
        )}
      </div>

      {p.estado === 'reservada' && (
        <div className="mt-4 rounded-md bg-pf-coral-soft px-4 py-3 text-sm font-semibold text-pf-coral">
          Esta propiedad está reservada. Si te interesa, consultá igual: a veces vuelve a quedar
          disponible.
        </div>
      )}

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {p.codigo} · {p.operacion} · {p.tipo}
              </p>
              <h1 className="mt-1 text-balance font-display text-2xl font-semibold text-pf-navy sm:text-3xl">
                {p.titulo}
              </h1>
              <p className="mt-1 text-ink-soft">{zonaVisible(p)}</p>
            </div>
            <BadgeEstado estado={p.estado} />
          </div>

          <div className="mt-5">
            <PriceTag propiedad={p} tamano="ficha" />
            {!p.precio_publico && (
              <p className="mt-1 text-sm text-ink-faint">
                El precio de esta propiedad se conversa directamente con la inmobiliaria.
              </p>
            )}
          </div>

          <div className="mt-6">
            <SpecGrid propiedad={p} />
          </div>

          {p.direccion ? (
            <p className="mt-4 text-sm text-ink-soft">
              <span className="font-semibold text-ink">Dirección:</span> {p.direccion}
            </p>
          ) : (
            <p className="mt-4 text-sm text-ink-faint">
              La dirección exacta se coordina directamente con la inmobiliaria.
            </p>
          )}

          {p.descripcion && (
            <div className="mt-6 max-w-prose">
              <h2 className="font-display text-lg font-semibold text-pf-navy">Descripción</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-soft">
                {p.descripcion}
              </p>
            </div>
          )}
        </div>

        {/* CTA: la consulta va directo al WhatsApp del negocio, sin formularios */}
        <aside className="h-fit rounded-lg border border-line-soft bg-surface p-5 lg:sticky lg:top-20">
          <p className="font-display text-lg font-semibold text-pf-navy">¿Te interesa?</p>
          <p className="mt-1 text-sm text-ink-soft">
            Consultá por la {p.codigo} y te responde una persona del equipo — sin formularios.
          </p>
          <div className="mt-4">
            <WhatsAppLink href={waHref}>Consultar por WhatsApp</WhatsAppLink>
          </div>
          <p className="mt-4 border-t border-line-soft pt-3 text-xs leading-relaxed text-ink-faint">
            {config.nombre} · {config.direccion}
            <br />
            {config.horario}
          </p>
        </aside>
      </div>
    </article>
  )
}
