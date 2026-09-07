import { Suspense } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { linkWhatsApp } from '@/lib/format'
// Import estático: Next conoce las dimensiones en build y no hay layout shift
import logoMapfre from '../../../public/logos/mapfre.png'
import logoSura from '../../../public/logos/sura.png'
import logoPorto from '../../../public/logos/porto-seguro.png'
import logoSancor from '../../../public/logos/sancor.png'
import { getConfig, getFaqs, getPortadas, getPropiedadesPublicas } from '@/lib/queries'
import { CARACTERISTICAS_VALIDAS, IDEAL_PARA, TIPOS_PATIO } from '@/lib/types'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'
import {
  FiltrosYListado,
  ListadoFiltrado,
} from '@/components/propiedades/ListadoFiltrado'

/*
  La canónica de la home es "/" A SECAS, sin los filtros.

  Los filtros viven en la URL (?operacion=venta&tipo=casa&caract=...), así que
  esta misma página existe en cientos de combinaciones que muestran recortes
  del mismo listado. Sin esta línea Google las trata como páginas distintas,
  reparte entre todas la fuerza que debería concentrar una sola, y puede
  terminar mostrando en los resultados una combinación de filtros rara en vez
  de la home limpia.

  Esto NO se hereda al resto del sitio: cada página declara la suya.
*/
export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

/*
  Home: hero + filtros + grilla + FAQs reales + cierre de contacto.
  Server Component puro: los filtros viven en la URL (searchParams), así que
  la página se renderiza en el servidor en cada request — para el volumen de
  una inmobiliaria de Tacuarembó eso es lo simple y alcanza de sobra.
*/
/*
  ESTA PÁGINA ES ESTÁTICA A PROPÓSITO, Y ROMPERLO ES FÁCIL.

  No recibe `searchParams` ni usa ninguna API dinámica, así que Next la
  prerenderiza y Vercel la sirve desde el CDN sin ejecutar una función. Los
  filtros de la URL los aplica el navegador (ListadoFiltrado).

  Por qué importa: mientras leía searchParams en el servidor, cada visita
  ejecutaba una función. Fueron 2,1 millones de invocaciones en 7 días solo en
  `/`, casi todas de bots que no compran casas.

  SI ALGUIEN AGREGA ACÁ `props.searchParams`, `cookies()`, `headers()` o un
  `fetch` sin cachear, la página vuelve a ser dinámica y el ahorro desaparece
  en silencio — el sitio sigue andando igual, solo que cobrando por visita.
  Para comprobarlo: `npx next build` tiene que mostrar `○ /`, no `ƒ /`.

  El revalidate mantiene el mismo comportamiento de antes: los datos se
  refrescan como máximo cada 5 minutos, y el panel la regenera al instante
  cuando se publica (revalidatePath('/') en admin/propiedades/actions.ts).
*/
export const revalidate = 300

export default async function Home() {
  let contenido: React.ReactNode
  try {
    const [config, todas, faqs] = await Promise.all([
      getConfig(),
      // El listado COMPLETO: los filtros se aplican después, en el navegador.
      getPropiedadesPublicas(),
      getFaqs(),
    ])
    // Objeto y no Map: esto cruza al cliente y un Map no es serializable.
    const portadas = Object.fromEntries(await getPortadas(todas.map((p) => p.id)))
    const tiposDisponibles = [...new Set(todas.map((p) => p.tipo))]
    // El select ofrece de 1 hasta la propiedad con más dormitorios (pedido del
    // cliente, 17/8). Los campos y chacras tienen dormitorios en null y no cuentan;
    // si NINGUNA propiedad tiene dormitorios, el máximo es 0 y el filtro no aparece.
    const dormitoriosMax = todas.reduce(
      (max, p) => (p.dormitorios != null && p.dormitorios > max ? p.dormitorios : max),
      0
    )
    // Mismo criterio para los filtros del 17/8: el chip existe si hay al menos
    // una propiedad que lo cumpla (?. porque ideal_para llega recién con el
    // SQL del 17/8 — hasta entonces, simplemente no hay chips)
    const hayTraspasos = todas.some((p) => p.operacion === 'traspaso')
    const idealesDisponibles = IDEAL_PARA.filter((v) =>
      todas.some((p) => p.ideal_para?.includes(v))
    )

    /*
      Lo mismo para los filtros detallados del 17/8: cada chip existe solo si
      hay al menos una propiedad que lo cumpla. Los `?.` son a propósito —
      hasta que se corra docs/sql/2026-08-17-filtros-detallados.sql las columnas
      nuevas no vienen en la view, y esto tiene que no romper mientras tanto.
    */
    const banosMax = todas.reduce(
      (max, p) => (p.banos != null && p.banos > max ? p.banos : max),
      0
    )
    const patiosDisponibles = TIPOS_PATIO.filter((t) => todas.some((p) => p.patio === t))
    const caracteristicasDisponibles = CARACTERISTICAS_VALIDAS.filter((c) =>
      todas.some((p) => p.caracteristicas?.includes(c))
    )
    const disponibles = {
      tipos: tiposDisponibles,
      dormitoriosMax,
      banosMax,
      hayTraspasos,
      patios: [...patiosDisponibles],
      caracteristicas: caracteristicasDisponibles,
      hayGaraje: todas.some((p) => p.garage === true),
      hayMascotasSi: todas.some((p) => p.acepta_mascotas === true),
      hayMascotasNo: todas.some((p) => p.acepta_mascotas === false),
      ideales: [...idealesDisponibles],
    }

    contenido = (
      <>
        {/* Hero: título serif + datos reales, nada de promesas infladas.
            Azul pleno de marca — pedido del cliente (17/8): "que el azul
            tenga más presencia". Los chips van en su barra blanca abajo,
            así conservan el mismo lenguaje visual en toda la página. */}
        <section className="bg-pf-blue">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[1fr_19rem] lg:gap-12">
            <div>
              <h1 className="max-w-xl text-balance font-display text-3xl font-semibold text-surface sm:text-4xl">
                Casas, apartamentos y campos en Tacuarembó
              </h1>
              {/* Texto dictado por el cliente el 18/8 (WhatsApp, hablado con su
                  padre) — va textual, sin campos en la descripción a pedido suyo */}
              <p className="mt-3 max-w-xl text-surface/85">
                En PF Negocios Inmobiliarios trabajamos desde 2021 ofreciendo soluciones
                inmobiliarias en Tacuarembó. Nos especializamos en la venta y alquiler de
                propiedades, brindando atención personalizada y acompañamiento durante todo el
                proceso.
              </p>
              <p className="mt-3 max-w-xl text-surface/85">
                Contamos con experiencia en el mercado inmobiliario local y trabajamos para
                conectar cada propiedad con la persona adecuada, ofreciendo un servicio basado en
                la confianza, el compromiso y la atención cercana.
              </p>

              {/* Corredores de garantías (17-18/8): la jerarquía la marca la frase
                  (MAPFRE y SURA nombradas como corredores); los logos van parejos
                  a pedido del cliente del 18/8. */}
              <div className="mt-7">
                <p className="max-w-xl text-sm font-semibold text-surface">
                  También somos corredores de garantías de alquiler de MAPFRE y SURA
                  <span className="font-normal text-surface/80">
                    , y trabajamos con Porto Seguro y Sancor.
                  </span>
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                  <span className="flex h-12 items-center rounded-md bg-surface px-4">
                    <Image src={logoMapfre} alt="MAPFRE" className="h-6 w-auto" />
                  </span>
                  <span className="flex h-12 items-center rounded-md bg-surface px-4">
                    <Image src={logoSura} alt="SURA" className="h-8 w-auto" />
                  </span>
                  <span className="flex h-12 items-center rounded-md bg-surface px-3">
                    <Image src={logoPorto} alt="Porto Seguro" className="h-9 w-auto" />
                  </span>
                  <span className="flex h-12 items-center rounded-md bg-surface px-4">
                    <Image src={logoSancor} alt="Sancor Seguros" className="h-6 w-auto" />
                  </span>
                </div>
              </div>
            </div>

            {/* Banco Santander a la derecha, más chico — pedido del cliente (18/8):
                "en el lado derecho más chiquito, igual que sobra espacio".
                En cel el grid colapsa y queda abajo de los logos. */}
            <aside className="self-center rounded-lg border border-surface/20 bg-surface/10 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-surface/70">
                Financiamiento
              </p>
              {/* Video institucional MiCasa (pedido del cliente, 19/8). Arranca
                  solo pero mudo — los navegadores bloquean autoplay con sonido —
                  y con controles para poder activar el audio. Pesa 2,4 MB. */}
              <video
                className="mt-2.5 w-full rounded-md"
                autoPlay
                muted
                loop
                playsInline
                controls
                aria-label="Video de Santander sobre el préstamo MiCasa"
              >
                <source src="/videos/santander.mp4" type="video/mp4" />
                Tu navegador no puede reproducir este video.
              </video>
              <p className="mt-2.5 text-sm leading-relaxed text-surface/90">
                Somos agentes <span className="font-semibold text-surface">MiCasa</span> de{' '}
                <span className="font-semibold text-surface">Banco Santander</span>: te
                gestionamos el financiamiento de tu casa con el banco.
              </p>
            </aside>
          </div>
        </section>
        {/*
          Los filtros y el listado son la ÚNICA parte de la home que depende de
          la URL, así que son la única que se renderiza en el cliente. Todo lo
          de arriba y lo de abajo queda en el HTML estático.

          EL FALLBACK NO ES UN "CARGANDO", Y ESO ES DELIBERADO: es el mismo
          listado SIN filtros. En una página prerenderizada, lo que Next manda
          en el HTML es el fallback, así que eso es exactamente lo que lee
          Google y lo que ve alguien sin JavaScript — las propiedades completas,
          no un hueco. Cambiarlo por un spinner sacaría el listado del HTML y se
          perdería la indexación de la home.
        */}
        <Suspense
          fallback={
            <FiltrosYListado
              todas={todas}
              portadas={portadas}
              disponibles={disponibles}
              whatsapp={config.whatsapp}
              filtros={{}}
            />
          }
        >
          <ListadoFiltrado
            todas={todas}
            portadas={portadas}
            disponibles={disponibles}
            whatsapp={config.whatsapp}
          />
        </Suspense>

        {/* FAQs reales de la base — acordeón nativo, cero JavaScript */}
        {faqs.length > 0 && (
          <section id="faqs" className="mx-auto max-w-2xl scroll-mt-20 px-4 py-10">
            <h2 className="font-display text-2xl font-semibold text-pf-navy">
              Preguntas frecuentes
            </h2>
            <div className="mt-4 divide-y divide-line-soft rounded-lg border border-line-soft bg-surface">
              {faqs.map((f) => (
                <details key={f.id} className="group px-5 py-4">
                  <summary className="cursor-pointer list-none font-semibold text-ink marker:content-none group-open:text-pf-blue">
                    {f.pregunta}
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.respuesta}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Cierre de contacto — azul pleno (pedido del 17/8), datos verdaderos */}
        <section className="mx-auto max-w-6xl px-4 pb-4 pt-2">
          <div className="rounded-lg bg-pf-blue px-6 py-8 sm:flex sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-surface">
                ¿Buscás algo puntual?
              </h2>
              <p className="mt-1 text-sm text-surface/85">
                Contanos qué necesitás. {config.horario}.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 sm:mt-0">
              <WhatsAppLink href={linkWhatsApp(config.whatsapp)} variante="invertido">
                Escribinos por WhatsApp
              </WhatsAppLink>
              <Link
                href="/contacto#agendar"
                className="text-sm font-semibold text-surface underline-offset-2 hover:underline"
              >
                o agendá una cita
              </Link>
            </div>
          </div>
        </section>
      </>
    )
  } catch {
    // Sin conexión a la base no hay listado: error humano, no un stack trace
    contenido = (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorBox
          titulo="No pudimos cargar las propiedades"
          queHacer="Es un problema nuestro, no tuyo. Esperá unos segundos y volvé a intentar."
          reintentarHref="/"
        />
      </div>
    )
  }

  return contenido
}
