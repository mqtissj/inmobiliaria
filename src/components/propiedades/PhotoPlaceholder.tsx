import { esRural } from '@/lib/types'

/*
  Placeholder para propiedades sin fotos cargadas: SVG propio por tipo
  (silueta de casa, colinas de campo, árbol de chacra) sobre degradé de marca.
  Desaparece solo cuando la inmobiliaria sube fotos reales.
*/
export function PhotoPlaceholder({ tipo, className = '' }: { tipo: string; className?: string }) {
  const rural = esRural(tipo)
  const chacra = tipo === 'chacra'

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br ${
        rural ? 'from-pf-teal-soft to-paper' : 'from-pf-blue-soft to-paper'
      } ${className}`}
    >
      {chacra ? (
        <svg viewBox="0 0 24 24" className="w-1/4 max-w-16 text-pf-teal opacity-60" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M12 3v7M8 7l4 3 4-3M5 20c0-5 3-7 7-7s7 2 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : rural ? (
        <svg viewBox="0 0 24 24" className="w-1/4 max-w-16 text-pf-teal opacity-60" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M3 20c2-6 4-6 6 0M9 20c2-8 4-8 6 0M15 20c1.5-5 3-5 4.5 0M3 20h18" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-1/4 max-w-16 text-pf-blue opacity-60" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M3 10.5 12 4l9 6.5V20H3ZM9 20v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}
