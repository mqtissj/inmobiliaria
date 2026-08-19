import type { Metadata } from 'next'
import { getConfig } from '@/lib/queries'
import { linkWhatsApp } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description:
    'Cómo maneja los datos personales la web de PF Negocios Inmobiliarios, según la Ley 18.331 de Uruguay.',
}

/*
  Escrita sobre lo que la web HACE hoy, no sobre una plantilla.

  REGLA DE ESTE ARCHIVO: cada afirmación de acá tiene que ser verificable
  leyendo el código. Si se agrega algo que toque datos personales, se actualiza
  esta página EN EL MISMO cambio — una política que promete de menos es tan
  incumplible como una que promete de más.

  Revisión del 17/8/2026, que encontró tres desfasajes reales:
   - decía que la web no pide ningún dato, pero /contacto tiene dos formularios
   - decía que la única cookie es la del panel, pero /recuperar escribe cookies
     antes de cualquier login (el code verifier de PKCE)
   - no mencionaba el conteo de intentos de acceso, que toca la IP

  Revisión del 19/8/2026, al descartarse el asistente virtual (CLAUDE.md §8):
  la sección "Si más adelante guardamos datos" anunciaba un asistente que iba a
  pedir datos de contacto. Eso ya no va a existir, así que la promesa quedó
  reescrita como lo que de verdad rige: hoy no se almacenan datos personales, y
  si eso cambia se pide consentimiento y se actualiza esta página. Se movió la
  fecha de vigencia, como manda la sección "Cambios" de esta misma política.

  Falta todavía la revisión de un abogado: esto es una auditoría técnica de
  que el texto coincide con el sistema, no asesoramiento legal.
*/
export default async function Privacidad() {
  const config = await getConfig()

  return (
    <article className="mx-auto max-w-prose px-4 py-10">
      <h1 className="font-display text-3xl font-semibold text-pf-navy">
        Política de privacidad
      </h1>
      <p className="mt-1 text-sm text-ink-faint">Vigente desde el 19 de agosto de 2026</p>

      <div className="mt-6 space-y-6 leading-relaxed text-ink-soft">
        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">Quiénes somos</h2>
          <p className="mt-2">
            {config.nombre}, con local en {config.direccion}, Uruguay. Ante cualquier duda sobre
            esta política podés escribirnos por{' '}
            <a
              href={linkWhatsApp(config.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-pf-blue hover:underline"
            >
              WhatsApp al {config.telefono}
            </a>{' '}
            o visitarnos en el local.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">
            Qué datos recoge esta web
          </h2>
          <p className="mt-2">
            Navegar y buscar propiedades no requiere registro. No usamos herramientas de
            analítica ni cookies publicitarias, no hacemos perfiles de visitantes y no vendemos
            ni compartimos información con terceros para publicidad.
          </p>
          <p className="mt-2">
            <strong>Los formularios de contacto no guardan nada.</strong> En la página de
            contacto hay dos formularios —uno para ofrecernos una propiedad y otro para pedir
            una cita— donde escribís tu nombre, tu teléfono y lo que quieras contarnos. Esos
            datos <em>no se almacenan en ningún servidor nuestro</em>: lo único que hace el
            formulario es ordenar lo que escribiste en un mensaje de WhatsApp que se abre en tu
            teléfono, y que enviás vos si querés. Si cerrás la ventana sin enviarlo, no queda
            nada en ninguna parte.
          </p>
          <p className="mt-2">
            A partir de ahí la conversación ocurre en WhatsApp: lo que decidas compartir ahí lo
            recibimos como cualquier mensaje y lo usamos únicamente para responderte. WhatsApp
            tiene sus propias condiciones de servicio, ajenas a esta web.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">
            Intentos de acceso al panel
          </h2>
          <p className="mt-2">
            Para que nadie pueda probar contraseñas en serie contra el panel interno, contamos
            cuántos intentos de inicio de sesión y de recuperación de contraseña llegan desde una
            misma conexión. Es una medida de seguridad, no de seguimiento.
          </p>
          <p className="mt-2">
            Ese conteo <strong>no guarda tu dirección IP ni tu correo</strong>. Antes de
            registrar nada, esos datos se transforman con una función criptográfica irreversible
            que solo permite saber si dos intentos vienen del mismo origen, sin poder recuperar
            cuál era. Los registros se borran automáticamente a las 24 horas.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">Cookies</h2>
          <p className="mt-2">
            Esta web no instala cookies de publicidad ni de análisis. Las únicas que puede
            escribir son técnicas y necesarias para que algo funcione:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              La <strong>sesión del panel interno</strong>, que solo se crea si alguien del
              equipo de la inmobiliaria inicia sesión.
            </li>
            <li>
              Una cookie temporal en la pantalla de <strong>recuperación de contraseña</strong>,
              que se escribe al pedir el mail y sirve para comprobar que el enlace se abre en el
              mismo navegador que lo pidió. Es parte del mecanismo de seguridad del enlace.
            </li>
          </ul>
          <p className="mt-2">
            Si solo mirás propiedades y nos escribís por WhatsApp, no se instala ninguna.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">
            Dónde se procesa la información
          </h2>
          <p className="mt-2">
            Esta web funciona sobre servicios de alojamiento y base de datos contratados a
            proveedores internacionales (Vercel y Supabase), cuyos servidores están fuera de
            Uruguay. Eso significa que la información técnica necesaria para servir las páginas
            —y el conteo de intentos descrito arriba— se procesa en el exterior, bajo los
            acuerdos de tratamiento de datos de esos proveedores. Las propiedades publicadas y
            los datos de la inmobiliaria se alojan ahí mismo.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">
            Si más adelante guardamos datos
          </h2>
          <p className="mt-2">
            Hoy esta web no almacena datos personales de quienes la visitan. Si eso llegara a
            cambiar, te vamos a pedir <strong>consentimiento explícito</strong> antes de guardar
            nada, vamos a registrar junto con tus datos el texto exacto del consentimiento y la
            fecha, y esta política se va a actualizar para explicar qué se guarda, para qué, por
            cuánto tiempo y cómo pedirnos que lo borremos.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">
            Tus derechos (Ley 18.331)
          </h2>
          <p className="mt-2">
            En Uruguay, la Ley 18.331 de Protección de Datos Personales te da derecho a acceder,
            rectificar y suprimir tus datos. Si en algún momento nos compartiste información y
            querés ejercer esos derechos, escribinos por WhatsApp o acercate al local y lo
            resolvemos sin costo. Si no quedaras conforme con nuestra respuesta, podés dirigirte
            a la Unidad Reguladora y de Control de Datos Personales (URCDP), que es el organismo
            que controla el cumplimiento de esa ley en Uruguay.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-pf-navy">Cambios</h2>
          <p className="mt-2">
            Si esta política cambia, la fecha de vigencia de arriba se actualiza. La versión
            publicada en esta página es siempre la que rige.
          </p>
        </section>
      </div>
    </article>
  )
}
