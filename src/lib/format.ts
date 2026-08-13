import type { Propiedad } from './types'
import { esRural } from './types'

// Precio como manda CLAUDE.md §7: toLocaleString('es-UY') y NUNCA convertir moneda.
// Devuelve null cuando no hay precio para mostrar — el que llama decide cómo decir "consultar".
export function formatoPrecio(p: Pick<Propiedad, 'precio' | 'moneda' | 'precio_publico'>): string | null {
  if (!p.precio_publico || p.precio == null) return null
  return `${p.moneda} ${Number(p.precio).toLocaleString('es-UY')}`
}

// Línea corta de specs para las tarjetas: urbano y rural muestran cosas distintas.
// CLAUDE.md §5: jamás filtrar/mostrar un campo por metros cuadrados ni una casa por CONEAT.
export function resumenSpecs(p: Propiedad): string {
  const partes: string[] = []
  if (esRural(p.tipo)) {
    if (p.hectareas != null) partes.push(`${Number(p.hectareas).toLocaleString('es-UY')} há`)
    if (p.indice_coneat != null) partes.push(`CONEAT ${p.indice_coneat}`)
    if (p.tiene_agua) partes.push('con agua')
  } else {
    if (p.dormitorios != null) partes.push(`${p.dormitorios} dorm.`)
    if (p.banos != null) partes.push(`${p.banos} ${p.banos === 1 ? 'baño' : 'baños'}`)
    if (p.m2_edificados != null) partes.push(`${p.m2_edificados} m² edif.`)
  }
  return partes.join(' · ')
}

// Zona visible de la tarjeta/ficha. La dirección exacta solo si mostrar_direccion
// (y la view pública ya la anula del lado de la base — esto es solo presentación).
export function zonaVisible(p: Propiedad): string {
  const partes = [p.barrio, p.ciudad].filter(Boolean)
  return partes.join(', ') || p.departamento || 'Tacuarembó'
}

// Link de consulta por WhatsApp con el texto prellenado.
// numero en formato wa.me: 59898756490 (sin +, sin espacios) — viene de config_negocio.
export function linkWhatsApp(numero: string, opts?: { codigo?: string; titulo?: string }): string {
  const texto = opts?.codigo
    ? `Hola! Vi en la web la propiedad ${opts.codigo} (${opts.titulo}) y quiero hacer una consulta.`
    : 'Hola! Vengo de la web de PF y quiero hacer una consulta.'
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}

export function linkInstagram(usuario: string): string {
  return `https://www.instagram.com/${usuario}/`
}
