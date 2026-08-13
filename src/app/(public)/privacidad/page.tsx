import type { Metadata } from 'next'
import { getConfig } from '@/lib/queries'
import { linkWhatsApp } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description:
    'Cómo maneja los datos personales la web de PF Negocios Inmobiliarios, según la Ley 18.331 de Uruguay.',
}

/*
  Escrita sobre lo que la web HACE hoy, no sobre una plantilla: la web pública
  no tiene formularios ni analytics — el único dato personal que existe es el
  que la persona decide mandar por WhatsApp. Cuando se sume el asistente
  virtual (que va a guardar contactos CON consentimiento), esta página se
  actualiza. No prometer acá cosas que el sistema no hace.
*/
export default async function Privacidad() {
  const config = await getConfig()

  return (
    <article className="mx-auto max-w-prose px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-pf-navy">
        Política de privacidad
      </h1>
      <p className="mt-1 text-sm text-ink-faint">Vigente desde el 13 de agosto de 2026</p>

      <div className="mt-6 space-y-6 leading-relaxed text-ink-soft">
        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">Quiénes somos</h2>
          <p className="mt-2">
            {config.nombre}, con local en {config.direccion}, Uruguay. Ante cualquier duda sobre
            esta política podés escribirnos por{' '}
            <a
              href={linkWhatsApp(config.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-pf-blue hover:underline"
            >
              WhatsApp al {config.telefono}
            </a>{' '}
            o visitarnos en el local.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">
            Qué datos recoge esta web
          </h2>
          <p className="mt-2">
            Navegar esta web no requiere registro y no te pide ningún dato personal. No usamos
            herramientas de analítica ni cookies publicitarias, y no vendemos ni compartimos
            información de visitantes con terceros.
          </p>
          <p className="mt-2">
            Cuando tocás “Consultar por WhatsApp”, la conversación ocurre en WhatsApp: lo que
            decidas compartir ahí (tu nombre, tu teléfono, tu consulta) lo recibimos como
            cualquier mensaje y lo usamos únicamente para responderte. WhatsApp tiene sus propias
            condiciones de servicio, ajenas a esta web.
          </p>
          <p className="mt-2">
            La única cookie que esta web instala es la de sesión del panel interno de
            administración, que solo usa el equipo de la inmobiliaria para trabajar. Si no
            iniciás sesión en ese panel, no se instala.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">
            Si más adelante guardamos datos
          </h2>
          <p className="mt-2">
            Si incorporamos formularios o un asistente virtual que registre datos de contacto,
            te vamos a pedir consentimiento explícito antes de guardar nada, y esta política se
            va a actualizar para explicar qué se guarda, para qué y por cuánto tiempo.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">
            Tus derechos (Ley 18.331)
          </h2>
          <p className="mt-2">
            En Uruguay, la Ley 18.331 de Protección de Datos Personales te da derecho a acceder,
            rectificar y suprimir tus datos. Si en algún momento nos compartiste información y
            querés ejercer esos derechos, escribinos por WhatsApp o acercate al local y lo
            resolvemos. También podés dirigirte a la Unidad Reguladora y de Control de Datos
            Personales (URCDP).
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">Cambios</h2>
          <p className="mt-2">
            Si esta política cambia, la fecha de vigencia de arriba se actualiza. La versión
            publicada en esta página es siempre la que rige.
          </p>
        </section>
      </div>
    </article>
  )
}
