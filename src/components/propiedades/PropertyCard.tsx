import Image from 'next/image'
import Link from 'next/link'
import { resumenSpecs, zonaVisible } from '@/lib/format'
import type { Propiedad } from '@/lib/types'
import { BadgeEstado } from '@/components/ui/Badge'
import { PhotoPlaceholder } from './PhotoPlaceholder'
import { PriceTag } from './PriceTag'

export function PropertyCard({ propiedad, fotoUrl }: { propiedad: Propiedad; fotoUrl?: string }) {
  const specs = resumenSpecs(propiedad)

  return (
    <Link
      href={`/propiedades/${propiedad.codigo.toLowerCase()}`}
      className="group overflow-hidden rounded-lg border border-line-soft bg-surface transition-shadow hover:shadow-lg hover:shadow-pf-navy/10"
    >
      <div className="relative aspect-[4/3]">
        {fotoUrl ? (
          <Image
            src={fotoUrl}
            alt={`Foto de ${propiedad.titulo}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <PhotoPlaceholder tipo={propiedad.tipo} className="absolute inset-0" />
        )}
        <div className="absolute left-2.5 top-2.5">
          <BadgeEstado estado={propiedad.estado} />
        </div>
      </div>

      <div className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {propiedad.codigo} · {propiedad.operacion} · {zonaVisible(propiedad)}
        </p>
        <h3 className="mt-1 font-semibold leading-snug text-ink group-hover:text-pf-blue">
          {propiedad.titulo}
        </h3>
        {specs && <p className="mt-1 text-sm text-ink-soft">{specs}</p>}
        <div className="mt-3">
          <PriceTag propiedad={propiedad} />
        </div>
      </div>
    </Link>
  )
}
