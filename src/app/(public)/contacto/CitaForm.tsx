'use client'

import { useState } from 'react'

/*
  Agendar una cita (pedido del cliente, 17/8). Igual que PropietarioForm:
  NO guarda nada en ninguna base — arma el mensaje de WhatsApp y lo abre,
  así la política de privacidad sigue siendo verdad. La cita la CONFIRMA una
  persona del equipo respondiendo ese WhatsApp; este form solo la pide (misma
  regla que va a tener el bot: la web nunca confirma visitas sola, CLAUDE.md §4.6).

  Vive sobre el bloque azul de /contacto: por eso los estilos son propios
  (labels claros, inputs blancos) y no los del form de propietarios.
*/
const claseInput =
  'mt-1 w-full rounded-md border border-transparent bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-pf-navy'
const claseLabel = 'block text-sm font-semibold text-surface'

const MOTIVOS = [
  'Visitar una propiedad',
  'Consultar por una compra',
  'Consultar por un alquiler',
  'Otro tema',
]
// Franjas a propósito amplias ("de mañana", no "9:15"): el horario fino se
// acuerda por WhatsApp con una persona, no contra una agenda que la web no tiene
const FRANJAS = ['De mañana', 'De tarde', 'Un sábado']

export function CitaForm({ whatsapp, propInicial = '' }: { whatsapp: string; propInicial?: string }) {
  const [nombre, setNombre] = useState('')
  const [motivo, setMotivo] = useState(propInicial ? MOTIVOS[0] : MOTIVOS[1])
  const [propiedad, setPropiedad] = useState(propInicial)
  const [franja, setFranja] = useState(FRANJAS[0])

  /*
    El botón es un LINK, igual que en PropietarioForm y por los mismos dos
    motivos, que acá se juntaban y lo dejaban del todo muerto (17/8):

    1. window.open() con un tercer argumento de "features" se trata como POPUP
       y los bloqueadores lo cortan sin avisar.
    2. El campo del nombre era `required`. Con el campo vacío el navegador
       frenaba el envío y el handler NI SE EJECUTABA — la validación nativa
       gana antes que React. Sobre el bloque azul, además, el globito de
       validación casi no se ve.

    Ya no hace falta que sea obligatorio: el mensaje se arma igual sin nombre
    (la línea simplemente no aparece), y quien responde el WhatsApp lo pregunta.
    Vale más una cita pedida sin nombre que un botón que no hace nada.
  */
  const lineas = [
    'Hola! Quiero agendar una cita.',
    nombre.trim() && `Soy ${nombre.trim()}.`,
    `Motivo: ${motivo.toLowerCase()}`,
    propiedad.trim() && `Propiedad: ${propiedad.trim()}`,
    `Me queda mejor: ${franja.toLowerCase()}.`,
  ].filter(Boolean)
  const href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(lineas.join('\n'))}`

  return (
    // Enter por onKeyDown y no por onSubmit: sin botón submit el formulario no
    // tiene envío implícito, así que un onSubmit sería código muerto.
    <form
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
          e.preventDefault()
          window.location.href = href
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="cita-nombre" className={claseLabel}>
            Tu nombre
          </label>
          <input
            id="cita-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Para saber con quién hablamos"
            className={claseInput}
          />
        </div>
        <div>
          <label htmlFor="cita-motivo" className={claseLabel}>
            Para qué
          </label>
          <select id="cita-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} className={claseInput}>
            {MOTIVOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cita-propiedad" className={claseLabel}>
            Propiedad <span className="font-normal text-surface/70">(si aplica)</span>
          </label>
          <input
            id="cita-propiedad"
            value={propiedad}
            onChange={(e) => setPropiedad(e.target.value)}
            placeholder="Código o título"
            className={claseInput}
          />
        </div>
        <div>
          <label htmlFor="cita-franja" className={claseLabel}>
            Cuándo te queda bien
          </label>
          <select id="cita-franja" value={franja} onChange={(e) => setFranja(e.target.value)} className={claseInput}>
            {FRANJAS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-surface px-5 py-2.5 text-sm font-semibold text-pf-blue transition-colors hover:bg-pf-blue-soft"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.2-.7l.4-.5c.1-.2.2-.3.3-.5v-.5c0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.3-.3Z" />
          </svg>
          Pedir la cita por WhatsApp
        </a>
        <p className="text-xs text-surface/70">
          Te confirma día y hora una persona del equipo. Esta web no guarda nada de lo que escribiste.
        </p>
      </div>
    </form>
  )
}
