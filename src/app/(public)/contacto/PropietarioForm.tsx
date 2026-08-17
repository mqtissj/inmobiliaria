'use client'

import { useState } from 'react'

/*
  Formulario para propietarios que quieren vender o alquilar SU propiedad.
  No guarda NADA en ninguna base: arma un mensaje de WhatsApp estructurado y
  lo abre. Así la política de privacidad ("esta web no recoge datos") sigue
  siendo verdad, y la conversación arranca donde PF ya trabaja: WhatsApp.
  Cuando exista la bandeja de leads (F8), esto puede pasar a guardarse — con
  consentimiento explícito, como manda la Ley 18.331.
*/
const claseInput =
  'mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-pf-blue'
const claseLabel = 'block text-sm font-semibold text-ink'

export function PropietarioForm({ whatsapp }: { whatsapp: string }) {
  const [operacion, setOperacion] = useState('vender')
  const [tipo, setTipo] = useState('casa')
  const [zona, setZona] = useState('')
  const [detalle, setDetalle] = useState('')

  /*
    El botón es un LINK, no un submit con window.open().

    Antes hacía window.open(url, '_blank', 'noopener,noreferrer'). Ese tercer
    argumento es el problema: cuando se pasan "features", el navegador deja de
    tratarlo como una pestaña y lo trata como POPUP — y los bloqueadores de
    popups lo cortan sin avisar. El usuario apretaba y no pasaba nada.

    Un <a href target="_blank"> no se puede bloquear, permite abrir en pestaña
    nueva con el botón del medio, y funciona aunque el JavaScript falle.
  */
  const lineas = [
    `Hola! Tengo una propiedad para ${operacion}.`,
    `Tipo: ${tipo}`,
    zona.trim() && `Zona: ${zona.trim()}`,
    detalle.trim() && `Detalle: ${detalle.trim()}`,
    '¿Cómo seguimos?',
  ].filter(Boolean)
  const href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(lineas.join('\n'))}`

  return (
    /*
      Enter va por onKeyDown, NO por onSubmit.
      Al reemplazar el botón submit por un <a>, el formulario se quedó sin
      envío implícito: un onSubmit acá nunca se dispararía. (Lo tuve mal en el
      primer arreglo del 17/8.) Se atiende la tecla directamente.
      Solo en <input>: en el textarea Enter tiene que seguir siendo un salto
      de línea, que es lo que espera cualquiera escribiendo un párrafo.
    */
    <form
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
          e.preventDefault()
          window.location.href = href
        }
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="prop-operacion" className={claseLabel}>
            Qué querés hacer
          </label>
          <select
            id="prop-operacion"
            value={operacion}
            onChange={(e) => setOperacion(e.target.value)}
            className={claseInput}
          >
            <option value="vender">Vender</option>
            <option value="alquilar">Poner en alquiler</option>
            <option value="tasar">Pedir una tasación</option>
          </select>
        </div>
        <div>
          <label htmlFor="prop-tipo" className={claseLabel}>
            Qué propiedad es
          </label>
          <select id="prop-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={claseInput}>
            <option value="casa">Casa</option>
            <option value="apartamento">Apartamento</option>
            <option value="campo">Campo</option>
            <option value="chacra">Chacra</option>
            <option value="terreno">Terreno</option>
            <option value="local">Local</option>
            <option value="otra">Otra</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="prop-zona" className={claseLabel}>
          Zona <span className="font-normal text-ink-faint">(opcional)</span>
        </label>
        <input
          id="prop-zona"
          value={zona}
          onChange={(e) => setZona(e.target.value)}
          placeholder="Barrio, paraje, ruta…"
          className={claseInput}
        />
      </div>

      <div>
        <label htmlFor="prop-detalle" className={claseLabel}>
          Algo más que quieras contar <span className="font-normal text-ink-faint">(opcional)</span>
        </label>
        <textarea
          id="prop-detalle"
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          rows={3}
          placeholder="Dormitorios, hectáreas, estado, apuro…"
          className={claseInput}
        />
      </div>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-md bg-pf-blue px-5 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-pf-navy"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.2-.7l.4-.5c.1-.2.2-.3.3-.5v-.5c0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.3-.3Z" />
        </svg>
        Abrir la conversación en WhatsApp
      </a>
      <p className="text-xs text-ink-faint">
        Esto abre WhatsApp con el mensaje ya armado — esta web no guarda nada de lo que escribiste.
      </p>
    </form>
  )
}
