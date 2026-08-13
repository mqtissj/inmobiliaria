import type { Metadata } from 'next'
import { linkInstagram, linkWhatsApp } from '@/lib/format'
import { getConfig } from '@/lib/queries'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'
import { PropietarioForm } from './PropietarioForm'

export const metadata: Metadata = {
  title: 'Contacto',
  description:
    'Escribile a PF Negocios Inmobiliarios por WhatsApp, visitá el local en 25 de Mayo 329, Tacuarembó, o contanos qué propiedad querés vender o alquilar.',
}

export default async function Contacto() {
  const config = await getConfig()
  const mapaHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${config.direccion}, Uruguay`
  )}`

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-pf-navy">Contacto</h1>
      <p className="mt-2 max-w-lg text-ink-soft">
        Somos {config.nombre}: trabajamos propiedades urbanas y rurales de Tacuarembó desde 2021,
        y somos corredores oficiales de SURA y Porto para garantías de alquiler.
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
            </div>
          </div>
        </div>

        {/* Propietarios: la sección que le trae negocio a PF */}
        <div className="rounded-lg border border-line-soft bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-pf-navy">
            ¿Tenés una propiedad para vender o alquilar?
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Contanos qué tenés y un asesor te responde. La tasación la hace una persona visitando
            la propiedad — no un formulario.
          </p>
          <div className="mt-5">
            <PropietarioForm whatsapp={config.whatsapp} />
          </div>
        </div>
      </div>
    </div>
  )
}
