'use server'

/*
  Define la contraseña nueva.

  Precondición: el usuario YA tiene sesión, porque /auth/callback canjeó el
  código del mail antes de mandarlo acá. updateUser({ password }) opera sobre
  la sesión activa — sin sesión no hay nada que actualizar, y por eso la
  pantalla chequea que exista antes de mostrar el formulario.

  No se pide la contraseña vieja: el que llegó hasta acá demostró que tiene
  acceso al mail de la cuenta, que es justamente lo que se estaba recuperando.
*/
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'

// Supabase exige 6 como mínimo. Pedimos 8: son 30 segundos más para el cliente
// y bastante más trabajo para quien quiera adivinarla.
const MINIMO = 8

export interface EstadoNuevaContrasena {
  error: string | null
  intento?: number
}

export async function definirContrasena(
  estado: EstadoNuevaContrasena,
  formData: FormData
): Promise<EstadoNuevaContrasena> {
  const password = String(formData.get('password') ?? '')
  const repetida = String(formData.get('password_repetida') ?? '')

  // Las contraseñas NO se devuelven nunca al navegador: el form se vacía y
  // está bien que se vacíe. `intento` está solo para remontarlo y poder
  // enfocar el primer campo.
  const fallo = (mensaje: string): EstadoNuevaContrasena => ({
    error: mensaje,
    intento: (estado.intento ?? 0) + 1,
  })

  if (password.length < MINIMO) {
    return fallo(`La contraseña tiene que tener al menos ${MINIMO} caracteres.`)
  }
  if (password !== repetida) {
    return fallo('Las dos contraseñas no coinciden. Escribilas de nuevo.')
  }

  const supabase = await supabaseServer()

  // Doble chequeo: si el link venció entre que se abrió la pantalla y se envió
  // el formulario, mejor decirlo claro que fallar con un error de la librería.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return fallo('El link venció o ya se usó. Pedí uno nuevo desde "Recuperar la contraseña".')
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('[definirContrasena] error de Supabase:', error)
    if (error.status === 422) {
      return fallo('Esa contraseña no es válida para Supabase. Probá con una más larga.')
    }
    return fallo('No se pudo cambiar la contraseña. Esperá unos segundos y volvé a intentar.')
  }

  // Ya tiene sesión, así que entra derecho al panel.
  redirect('/admin?contrasena=cambiada')
}
