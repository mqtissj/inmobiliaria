/*
  Marca "PF" dibujada a mano en SVG: serif con la onda celeste del logo real.
  Es una aproximación propia hasta tener el logo en alta del cliente
  (pregunta F1 del cuestionario) — no un ícono de librería.
*/
export function BrandMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
      <circle cx="22" cy="22" r="21" fill="var(--color-surface)" stroke="var(--color-line)" />
      <text
        x="10"
        y="29"
        fontFamily="var(--font-source-serif), Georgia, serif"
        fontSize="21"
        fontWeight="700"
        fill="var(--color-pf-blue)"
      >
        P
      </text>
      <text
        x="22"
        y="29"
        fontFamily="var(--font-source-serif), Georgia, serif"
        fontSize="21"
        fontWeight="700"
        fill="var(--color-pf-navy)"
      >
        F
      </text>
      <path
        d="M8 24 C 15 20, 22 27, 36 22"
        fill="none"
        stroke="var(--color-pf-teal)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
