import type { Metadata } from 'next'
import { linkFacebook, linkInstagram, linkWhatsApp } from '@/lib/format'
import { getConfig } from '@/lib/queries'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'
import { CitaForm } from './CitaForm'
import { PropietarioForm } from './PropietarioForm'

export const metadata: Metadata = {
  title: 'Contacto',
  description:
    'Escribile a PF Negocios Inmobiliarios por WhatsApp, agendá una cita, visitá el local en 25 de Mayo 329, Tacuarembó, o contanos qué propiedad querés vender o alquilar.',
}

export default async function Contacto(props: PageProps<'/contacto'>) {
  const sp = await props.searchParams
  // Viniendo de una ficha ("Agendar una visita"), el código llega en la URL
  // y el form de cita arranca con la propiedad puesta
  const propInicial = typeof sp.prop === 'string' ? sp.prop : ''
  const config = await getConfig()
  const mapaHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${config.direccion}, Uruguay`
  )}`

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-pf-navy">Contacto</h1>
      <p className="mt-2 max-w-lg text-ink-soft">
        Somos {config.nombre}: trabajamos propiedades urbanas y rurales de Tacuarembó desde 2021.
        Para alquilar, somos corredores de garantías de MAPFRE y SURA — también trabajamos con
        Porto Seguro y Sancor. Y si comprás, como agentes MiCasa de Banco Santander te podemos
        gestionar el financiamiento con el banco.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1fr]">
        {/* Cómo encontrarnos: datos reales, un solo lugar */}
        <div className="space-y-6">
          <div className="rounded-lg border border-line-soft bg-surface p-6">
            <h2 className="font-display text-lg font-semibold text-pf-navy">El local</h2>
            <p className="mt-2 text-ink-soft">{config.direccion}</p>
            <p className="mt-1 text-sm text-ink-soft">{config.horario}</p>
            <a
              href={mapaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-semibold text-pf-blue hover:underline"
            >
              Cómo llegar (Google Maps) ↗
            </a>
          </div>

          <div className="rounded-lg border border-line-soft bg-surface p-6">
            <h2 className="font-display text-lg font-semibold text-pf-navy">Directo</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Para consultas por una propiedad publicada, el botón de WhatsApp de su ficha ya lleva
              el código armado. Para todo lo demás:
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <WhatsAppLink href={linkWhatsApp(config.whatsapp)}>
                WhatsApp {config.telefono}
              </WhatsAppLink>
              <a
                href={linkInstagram(config.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-pf-blue hover:underline"
              >
                Instagram @{config.instagram} ↗
              </a>
              <a
                href={linkFacebook(config.facebook)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-pf-blue hover:underline"
              >
                Facebook ↗
              </a>
            </div>
          </div>
        </div>

        {/* Propietarios: la sección que le trae negocio a PF.
            El id lo usa el botón "Propietario" de los filtros de la home. */}
        <div id="propietarios" className="scroll-mt-20 rounded-lg border border-line-soft bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-pf-navy">
            ¿Tenés una propiedad para vender o alquilar?
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Contanos qué tenés y un asesor te responde. Hacemos tasaciones de cualquier tipo — y
            la tasación la hace una persona visitando la propiedad, no un formulario.
          </p>
          {/* Requisitos dictados por el cliente el 17/8 (PREGUNTAS.txt): que el
              propietario sepa de antemano qué le vamos a pedir */}
          <p className="mt-3 text-sm text-ink-soft">
            Para publicarla vamos a pedirte: <span className="font-semibold text-ink">número de
            padrón</span>, datos del propietario, dirección y ubicación, y estado general
            (remodelaciones, nueva, a estrenar).
          </p>
          <div className="mt-5">
            <PropietarioForm whatsapp={config.whatsapp} />
          </div>
        </div>
      </div>

      {/* Agendar una cita (pedido del cliente, 17/8) — bloque azul pleno,
          distinto a las tarjetas de arriba a propósito: es el remate de la
          página, no una tarjeta más */}
      <section id="agendar" className="mt-10 scroll-mt-20 rounded-lg bg-pf-blue px-6 py-8">
        <h2 className="font-display text-xl font-semibold text-surface">Agendá una cita</h2>
        <p className="mt-1 max-w-xl text-sm text-surface/85">
          Contanos para qué y cuándo te queda bien. Atendemos {config.horario.toLowerCase()} en{' '}
          {config.direccion.split(',')[0]}.
        </p>
        <div className="mt-5">
          <CitaForm whatsapp={config.whatsapp} propInicial={propInicial} />
        </div>
      </section>
    </div>
  )
}
