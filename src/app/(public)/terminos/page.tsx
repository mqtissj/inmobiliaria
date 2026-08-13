import type { Metadata } from 'next'
import { getConfig } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description:
    'Condiciones de uso de la web de PF Negocios Inmobiliarios: alcance de la información publicada y cómo se concretan las operaciones.',
}

export default async function Terminos() {
  const config = await getConfig()

  return (
    <article className="mx-auto max-w-prose px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-pf-navy">
        Términos y condiciones
      </h1>
      <p className="mt-1 text-sm text-ink-faint">Vigentes desde el 13 de agosto de 2026</p>

      <div className="mt-6 space-y-6 leading-relaxed text-ink-soft">
        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">
            Qué es esta web
          </h2>
          <p className="mt-2">
            Es el sitio informativo de {config.nombre} ({config.direccion}). Publica propiedades
            que la inmobiliaria administra u ofrece, para que puedas verlas y consultarnos. Acá
            no se compra, no se alquila, no se reserva ni se paga nada: toda operación se
            conversa y se concreta directamente con nuestro equipo.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">
            Sobre la información publicada
          </h2>
          <p className="mt-2">
            Los datos de cada propiedad (precios, medidas, superficies, índice CONEAT,
            disponibilidad, fotos) se publican de buena fe con la información disponible al
            momento de la carga, y son orientativos: pueden cambiar sin previo aviso o contener
            errores involuntarios. Nada de lo publicado constituye oferta contractual — las
            condiciones definitivas de cualquier operación se confirman siempre por escrito con
            la inmobiliaria.
          </p>
          <p className="mt-2">
            Los precios se expresan en la moneda en que fueron pactados con cada propietario
            (dólares o pesos uruguayos) y no se convierten. Cuando figura “consultar precio”,
            el valor se conversa directamente con nosotros.
          </p>
          <p className="mt-2">
            Por seguridad de los propietarios, algunas propiedades no publican su dirección
            exacta: se coordina al momento de la visita.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">
            Uso del contenido
          </h2>
          <p className="mt-2">
            Las fotos y textos de las propiedades pertenecen a {config.nombre} o a sus
            propietarios y se publican solo para difundir cada propiedad. No está permitido
            reutilizarlos con fines comerciales sin autorización.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">
            Ley aplicable
          </h2>
          <p className="mt-2">
            Estos términos se rigen por la ley uruguaya. Para cualquier diferencia derivada del
            uso de esta web son competentes los tribunales del departamento de Tacuarembó.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">Cambios</h2>
          <p className="mt-2">
            Si estos términos cambian, la fecha de vigencia de arriba se actualiza. La versión
            publicada en esta página es la que rige.
          </p>
        </section>
      </div>
    </article>
  )
}
