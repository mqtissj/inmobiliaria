/*
  Botón/link de WhatsApp. Es un <a> porque ES un link (abre wa.me);
  no hay JS ni tracking — el link ya lleva el texto prellenado.
*/
export function WhatsAppLink({
  href,
  children,
  variante = 'primario',
}: {
  href: string
  children: React.ReactNode
  // 'invertido' es para fondos azul pleno (hero, cierre): botón blanco con texto azul
  variante?: 'primario' | 'compacto' | 'invertido'
}) {
  const estilos = {
    primario:
      'inline-flex items-center gap-2 rounded-md bg-pf-blue px-5 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-pf-navy',
    compacto:
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-pf-blue transition-colors hover:border-pf-blue',
    invertido:
      'inline-flex items-center gap-2 rounded-md bg-surface px-5 py-2.5 text-sm font-semibold text-pf-blue transition-colors hover:bg-pf-blue-soft',
  }[variante]

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={estilos}>
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.2-.7l.4-.5c.1-.2.2-.3.3-.5v-.5c0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.3-.3Z" />
      </svg>
      {children}
    </a>
  )
}
