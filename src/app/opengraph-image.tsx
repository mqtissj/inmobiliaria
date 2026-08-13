import { ImageResponse } from 'next/og'

/*
  Imagen que aparece al compartir el link por WhatsApp/Instagram (REGLAS §6:
  sin Open Graph, el link compartido es una URL pelada y nadie clickea).
  Se genera acá mismo con los colores de PF — sin archivos externos.
  ImageResponse solo soporta flexbox y fuentes propias por ArrayBuffer,
  así que va tipografía default: alcanza para la tarjeta del link.
*/
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
          <div
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '48px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              fontWeight: 700,
              color: '#1c5fa6',
            }}
          >
            PF
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
