import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/*
  Imagen que aparece al compartir el link por WhatsApp/Instagram (REGLAS §6:
  sin Open Graph, el link compartido es una URL pelada y nadie clickea).
  Para PF esto importa más que el SEO: WhatsApp ES el canal.

  ImageResponse solo entiende flexbox, y las imágenes tienen que llegarle como
  data URI — no puede salir a buscar un archivo por su cuenta. Por eso el logo
  se lee del disco acá arriba, una sola vez cuando se carga el módulo, y se
  incrusta en base64.

  Se lee con readFile + process.cwd() porque es el patrón documentado en esta
  versión de Next (node_modules/next/dist/docs/.../opengraph-image.md). Es
  seguro en Vercel porque esta ruta se PRERENDERIZA en el build: el archivo se
  lee mientras se compila, cuando src/app/icon.jpg está garantizado, y lo que
  se despliega es el PNG ya hecho.

  El mismo icon.jpg es el favicon del sitio: un solo archivo, una sola marca.
*/
const logo = await readFile(join(process.cwd(), 'src/app/icon.jpg'))
const logoDataUri = `data:image/jpeg;base64,${logo.toString('base64')}`

export const alt = 'PF Negocios Inmobiliarios — propiedades en Tacuarembó'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#161d2e',
          color: '#ffffff',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          {/* El logo viene con fondo blanco, así que la caja blanca no es
              decoración: es lo que evita que se vea un recuadro flotando
              sobre el azul oscuro. */}
          <div
            style={{
              width: '148px',
              height: '148px',
              borderRadius: '20px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse no usa next/image */}
            <img src={logoDataUri} width={128} height={128} alt="" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '56px', fontWeight: 700 }}>PF Negocios Inmobiliarios</div>
            <div style={{ fontSize: '30px', color: '#9fb3c8', marginTop: '8px' }}>
              Casas, apartamentos y campos en Tacuarembó
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: '56px',
            width: '360px',
            height: '10px',
            borderRadius: '5px',
            background: '#1e7c9c',
          }}
        />
        <div style={{ display: 'flex', fontSize: '24px', color: '#9fb3c8', marginTop: '40px' }}>
          25 de Mayo 329 · WhatsApp 098 756 490 · desde 2021
        </div>
      </div>
    ),
    size
  )
}
