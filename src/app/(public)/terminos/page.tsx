import type { Metadata } from 'next'
import Link from 'next/link'
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
      <p className="mt-1 text-sm text-ink-faint">Vigentes desde el 17 de agosto de 2026</p>

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
            Los formularios y las citas
          </h2>
          <p className="mt-2">
            Los formularios de la página de contacto no envían nada por sí solos: ordenan lo que
            escribiste en un mensaje de WhatsApp que enviás vos. Mandarlo es el comienzo de una
            conversación, no una solicitud registrada.
          </p>
          <p className="mt-2">
            Pedir una cita <strong>no reserva un horario</strong>. Una visita queda agendada
            recién cuando una persona de {config.nombre} te la confirma. Del mismo modo, ofrecer
            una propiedad a través del formulario no genera obligación de publicarla ni de
            comercializarla.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">
            Comisiones y honorarios
          </h2>
          {/*
            El cliente indicó el 17/8/2026 que cobran 60% de comisión, pero no aclaró
            sobre qué base (un mes de alquiler / el precio de venta). No se publica un
            número hasta confirmarlo: un porcentaje mal expresado en el sitio de una
            inmobiliaria es un problema comercial y potencialmente legal.
            Cuando se confirme, el número va ACÁ y también en la FAQ de la base.
          */}
          <p className="mt-2">
            La intermediación de {config.nombre} tiene una comisión que varía según el tipo de
            operación. El monto exacto, junto con los demás gastos que pueda tener la operación,
            se informa por escrito antes de firmar nada. Nada de lo publicado en esta web incluye
            ni sustituye esa información.
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
            Estos términos se rigen por la ley uruguaya. Las diferencias derivadas del uso de
            esta web se procurarán resolver de buena fe y, en su defecto, ante los tribunales
            competentes según la ley, sin perjuicio de los derechos que la Ley 17.250 de
            Relaciones de Consumo reconoce a los consumidores.
          </p>
          <p className="mt-2">
            El tratamiento de datos personales se rige por nuestra{' '}
            <Link href="/privacidad" className="font-semibold text-pf-blue hover:underline">
              política de privacidad
            </Link>
            .
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
