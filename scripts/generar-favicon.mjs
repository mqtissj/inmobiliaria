// Genera src/app/favicon.ico a partir del logo (src/app/icon.jpg).
// Corre con: node scripts/generar-favicon.mjs
//
// POR QUÉ EXISTE ESTO
// El sitio ya tenía icon.jpg, que Next publica como <link rel="icon">. Pero
// Google, cuando va a buscar el iconito que muestra al lado del resultado de
// búsqueda, también pega contra /favicon.ico — y eso daba 404. Además Google
// recomienda que el icono sea CUADRADO y de un tamaño múltiplo de 48px;
// icon.jpg es 808x808 (cuadrado sí, múltiplo de 48 no).
// Este script deja las dos cosas: el .ico en la raíz y los tamaños 16/32/48.
//
// El logo original viene con mucho margen blanco alrededor. A 16px eso hace
// que las letras queden diminutas, así que se recorta el blanco y se vuelve a
// poner un margen chico y controlado.
//
// sharp no está en package.json: viene instalado como dependencia de Next.
// No pasa nada porque esto se corre a mano y lo que se commitea es el .ico ya
// generado — el build de Vercel nunca ejecuta este archivo.

import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ORIGEN = fileURLToPath(new URL('../src/app/icon.jpg', import.meta.url))
const DESTINO = fileURLToPath(new URL('../src/app/favicon.ico', import.meta.url))

const TAMANOS = [16, 32, 48]
const BLANCO = { r: 255, g: 255, b: 255, alpha: 1 }

/*
  Un .ico es un contenedor: 6 bytes de cabecera, después una entrada de 16
  bytes por imagen, y al final los archivos pegados uno atrás del otro.
  Adentro metemos PNGs (lo entienden todos los navegadores modernos y Google).
*/
function armarIco(imagenes) {
  const cabecera = Buffer.alloc(6)
  cabecera.writeUInt16LE(0, 0) // reservado, siempre 0
  cabecera.writeUInt16LE(1, 2) // tipo 1 = icono
  cabecera.writeUInt16LE(imagenes.length, 4)

  // Los datos arrancan después de la cabecera + todas las entradas.
  let offset = 6 + imagenes.length * 16

  const entradas = imagenes.map(({ lado, png }) => {
    const entrada = Buffer.alloc(16)
    entrada.writeUInt8(lado === 256 ? 0 : lado, 0) // 0 significa 256
    entrada.writeUInt8(lado === 256 ? 0 : lado, 1)
    entrada.writeUInt8(0, 2) // paleta: 0 = color directo
    entrada.writeUInt8(0, 3) // reservado
    entrada.writeUInt16LE(1, 4) // planos
    entrada.writeUInt16LE(32, 6) // bits por pixel
    entrada.writeUInt32LE(png.length, 8)
    entrada.writeUInt32LE(offset, 12)
    offset += png.length
    return entrada
  })

  return Buffer.concat([cabecera, ...entradas, ...imagenes.map((i) => i.png)])
}

// trim() saca el borde blanco. Después extend() devuelve un margen chico
// (~8%) para que el logo no toque los bordes del cuadrado.
const recortado = await sharp(ORIGEN).trim({ background: BLANCO, threshold: 12 }).toBuffer()
const { width, height } = await sharp(recortado).metadata()
const margen = Math.round(Math.max(width, height) * 0.08)

const base = await sharp(recortado)
  .extend({ top: margen, bottom: margen, left: margen, right: margen, background: BLANCO })
  .toBuffer()

const imagenes = []
for (const lado of TAMANOS) {
  const png = await sharp(base)
    .resize(lado, lado, { fit: 'contain', background: BLANCO })
    // ensureAlpha() NO es decorativo: el decodificador de .ico que usa Next
    // (el crate `image` de Rust) solo acepta PNGs en RGBA. El logo viene de un
    // JPEG, así que sin esto sharp escribe RGB sin canal alfa y el build revienta
    // con "The PNG is not in RGBA format!". Se probó: pasa de verdad.
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer()
  imagenes.push({ lado, png })
}

writeFileSync(DESTINO, armarIco(imagenes))

console.log(`Logo original: ${(await sharp(ORIGEN).metadata()).width}px`)
console.log(`Recortado a:   ${width}x${height} (+${margen}px de margen)`)
console.log(`Escrito:       src/app/favicon.ico — ${TAMANOS.join(', ')}px`)
