import { linkWhatsApp } from '@/lib/format'
import { getConfig, getFaqs, getPortadas, getPropiedadesPublicas } from '@/lib/queries'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'
import { FilterChips } from '@/components/propiedades/FilterChips'
import { PropertyCard } from '@/components/propiedades/PropertyCard'

/*
  Home: hero + filtros + grilla + FAQs reales + cierre de contacto.
  Server Component puro: los filtros viven en la URL (searchParams), así que
  la página se renderiza en el servidor en cada request — para el volumen de
  una inmobiliaria de Tacuarembó eso es lo simple y alcanza de sobra.
*/
export default async function Home(props: PageProps<'/'>) {
  const sp = await props.searchParams
  const operacion = typeof sp.operacion === 'string' ? sp.operacion : undefined
  const tipo = typeof sp.tipo === 'string' ? sp.tipo : undefined
  // Number('abc') es NaN y NaN || undefined cae en undefined: un valor basura
  // en la URL simplemente no filtra, no rompe
  const dormitorios =
    typeof sp.dormitorios === 'string' ? Number(sp.dormitorios) || undefined : undefined

  let contenido: React.ReactNode
  try {
    const [config, propiedades, todas, faqs] = await Promise.all([
      getConfig(),
      getPropiedadesPublicas({ operacion, tipo, dormitorios }),
      getPropiedadesPublicas({}), // sin filtro, para derivar los chips disponibles
      getFaqs(),
    ])
    const portadas = await getPortadas(propiedades.map((p) => p.id))
    const tiposDisponibles = [...new Set(todas.map((p) => p.tipo))]
    // Solo los valores realmente cargados; los campos/chacras tienen null y no cuentan
    const dormitoriosDisponibles = [
      ...new Set(todas.map((p) => p.dormitorios).filter((d): d is number => d != null)),
    ].sort((a, b) => a - b)

    contenido = (
      <>
        {/* Hero: título serif + datos reales, nada de promesas infladas */}
        <section className="border-b border-line-soft bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
            <h1 className="max-w-xl text-balance font-display text-3xl font-semibold text-pf-navy sm:text-4xl">
              Casas, apartamentos y campos en Tacuarembó
            </h1>
            <p className="mt-3 max-w-lg text-ink-soft">
              Propiedades en venta y alquiler. Atendemos en {config.direccion.split(',')[0]} y
              por WhatsApp — desde 2021.
            </p>
            <div className="mt-6">
              <FilterChips
                operacionActiva={operacion}
                tipoActivo={tipo}
                tiposDisponibles={tiposDisponibles}
                dormitoriosActivo={dormitorios}
                dormitoriosDisponibles={dormitoriosDisponibles}
              />
            </div>
          </div>
        </section>

        {/* Listado */}
        <section className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-sm text-ink-faint">
            {propiedades.length === 1
              ? '1 propiedad'
              : `${propiedades.length} propiedades`}
            {operacion ? ` en ${operacion}` : ''}
            {tipo ? ` · ${tipo}` : ''}
            {dormitorios ? ` · ${dormitorios} ${dormitorios === 1 ? 'dormitorio' : 'dormitorios'}` : ''}
          </p>

          {propiedades.length > 0 ? (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {propiedades.map((p) => (
                <PropertyCard key={p.id} propiedad={p} fotoUrl={portadas.get(p.id)} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-line-soft bg-surface p-8 text-center">
              <p className="font-semibold text-ink">
                Ahora mismo no tenemos propiedades con ese filtro.
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Escribinos por WhatsApp y te avisamos apenas entre una que te sirva.
              </p>
              <div className="mt-4 flex justify-center">
                <WhatsAppLink href={linkWhatsApp(config.whatsapp)}>Avisame</WhatsAppLink>
              </div>
            </div>
          )}
        </section>

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

        {/* Cierre de contacto — un solo CTA, datos verdaderos */}
        <section className="mx-auto max-w-6xl px-4 pb-4 pt-2">
          <div className="rounded-lg bg-pf-blue-soft px-6 py-8 sm:flex sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-pf-navy">
                ¿Buscás algo puntual?
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Contanos qué necesitás. {config.horario}.
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <WhatsAppLink href={linkWhatsApp(config.whatsapp)}>
                Escribinos por WhatsApp
              </WhatsAppLink>
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
