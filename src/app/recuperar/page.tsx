import type { Metadata } from 'next'
import { AuthShell } from '@/components/ui/AuthShell'
import { RecuperarForm } from './RecuperarForm'

// Página privada: no tiene nada que hacer en Google (REGLAS: noindex)
export const metadata: Metadata = {
  title: 'Recuperar la contraseña',
  robots: { index: false, follow: false },
}

export default function RecuperarPage() {
  return (
    <AuthShell
      titulo="Recuperar la contraseña"
      bajada="Te mandamos un link por mail para que puedas poner una nueva."
      pie="Si el mail del panel ya no existe o no tenés acceso, escribile a Matías."
    >
      <RecuperarForm />
    </AuthShell>
  )
}
