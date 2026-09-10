'use client'

import { useEffect, useRef, useState } from 'react'

/*
  El video institucional de Santander, que se carga SOLO cuando se llega a él.

  POR QUÉ (10/9/2026): el archivo pesa 2,4 MB y su URL estaba escrita en el HTML
  de la home. Como la home es estática, ese HTML es idéntico para todos, así que
  cualquiera que lo leyera se llevaba el video. Medido con `vercel metrics`:
  `meta-externalagent` se bajó /videos/santander.mp4 41.276 veces en 48 horas,
  unos 99 GB — tres cuartos del tope mensual de transferencia, por un video de
  13 segundos que ningún humano pidió.

  El firewall ya bloquea a esos raspadores (ruleset ai_bots en modo deny). Esto
  es la segunda tranca, para el que se disfrace de navegador: montando el
  <video> desde JavaScript, la URL NO está en el HTML y no hay nada que seguir
  para quien solo parsea el documento.

  LO QUE NO CAMBIA: la gente real lo sigue viendo arrancar solo, mudo y en loop,
  como pidió el cliente el 19/8. El observer dispara 200px antes de que entre en
  pantalla, así que en la práctica ya está cargado cuando se lo mira.
*/

export function VideoSantander() {
  const contenedor = useRef<HTMLDivElement>(null)
  const [montar, setMontar] = useState(false)

  useEffect(() => {
    const nodo = contenedor.current
    if (!nodo) return

    // Sin IntersectionObserver (navegadores viejos) se monta directo: mejor
    // gastar los 2,4 MB que dejar a alguien sin el video.
    if (typeof IntersectionObserver === 'undefined') {
      setMontar(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return
        setMontar(true)
        observer.disconnect() // una sola vez: después ya está en el DOM
      },
      { rootMargin: '200px' }
    )
    observer.observe(nodo)
    return () => observer.disconnect()
  }, [])

  return (
    /*
      El contenedor reserva el espacio ANTES de que exista el video, con la
      proporción real del archivo (848x478, que es 16:9). Sin esto el texto de
      abajo saltaría al montarse, que es exactamente el problema que Google
      mide como CLS.
    */
    <div
      ref={contenedor}
      className="mt-2.5 aspect-video w-full overflow-hidden rounded-md bg-surface/10"
    >
      {montar && (
        <video
          className="h-full w-full"
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
      )}
    </div>
  )
}
