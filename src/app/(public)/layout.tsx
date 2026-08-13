import Link from 'next/link'
import { linkInstagram, linkWhatsApp } from '@/lib/format'
import { getConfig } from '@/lib/queries'
import { BrandMark } from '@/components/ui/BrandMark'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'

/*
  Layout de toda la cara pública: header con la marca y CTA de WhatsApp,
  footer con los datos reales del negocio (salen de config_negocio, no
  hardcodeados — si la inmobiliaria cambia el horario, se cambia en la base).
*/
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const config = await getConfig()

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line-soft bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-display text-base font-semibold leading-tight text-pf-navy sm:text-lg">
              {config.nombre}
            </span>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-5">
            <Link
              href="/#faqs"
              className="hidden text-sm font-semibold text-ink-soft transition-colors hover:text-pf-blue md:block"
            >
              Preguntas frecuentes
            </Link>
            <Link
              href="/contacto"
              className="text-sm font-semibold text-ink-soft transition-colors hover:text-pf-blue"
            >
              Contacto
            </Link>
            <WhatsAppLink href={linkWhatsApp(config.whatsapp)} variante="compacto">
              {config.telefono}
            </WhatsAppLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 bg-pf-navy text-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-8 w-8" />
              <span className="font-display font-semibold">{config.nombre}</span>
            </div>
            <p className="mt-3 text-sm text-surface/70">
              En Tacuarembó desde 2021. Corredores oficiales de SURA y PORTO.
            </p>
          </div>

          <div className="text-sm text-surface/80">
            <p className="font-semibold text-surface">Dónde estamos</p>
            <p className="mt-2">{config.direccion}</p>
            <p className="mt-1">{config.horario}</p>
          </div>

          <div className="text-sm">
            <p className="font-semibold text-surface">Contacto</p>
            <p className="mt-2">
              <a
                href={linkWhatsApp(config.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-surface/80 underline-offset-2 transition-colors hover:text-surface hover:underline"
              >
                WhatsApp {config.telefono}
              </a>
            </p>
            <p className="mt-1">
              <a
                href={linkInstagram(config.instagram)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-surface/80 underline-offset-2 transition-colors hover:text-surface hover:underline"
              >
                Instagram @{config.instagram}
              </a>
            </p>
          </div>
        </div>
        <div className="border-t border-surface/10 px-4 py-4">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-xs text-surface/50 sm:flex-row">
            <p>
              © {new Date().getFullYear()} {config.nombre} · Tacuarembó, Uruguay
            </p>
            <nav className="flex flex-wrap justify-center gap-4">
              <Link href="/contacto" className="transition-colors hover:text-surface">
                Contacto
              </Link>
              <Link href="/privacidad" className="transition-colors hover:text-surface">
                Política de privacidad
              </Link>
              <Link href="/terminos" className="transition-colors hover:text-surface">
                Términos y condiciones
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </>
  )
}
