import type { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

/*
  Ping diario que evita que Supabase pause el proyecto.

  POR QUÉ EXISTE
  En el plan Free, Supabase PAUSA el proyecto tras 1 semana sin actividad. Si
  eso pasa, el sitio deja de mostrar propiedades y no se arregla solo: hay que
  entrar al dashboard a reactivarlo a mano. Una semana floja de visitas en
  Tacuarembó alcanza para que ocurra, y nadie se entera hasta que un cliente
  se queja.

  Lo dispara Vercel Cron, configurado en vercel.json. La ruta tiene que hacer
  una consulta REAL a la base: devolver 200 sin tocar Supabase no cuenta como
  actividad y el proyecto se pausaría igual.

  SOBRE EL HORARIO (vercel.json no admite comentarios, así que va acá):
  `0 9 * * *` es todos los días a las 09:00 UTC, o sea 6 de la mañana en
  Uruguay. En el plan Hobby de Vercel el cron SOLO puede ser diario — una
  expresión más seguida hace fallar el deploy entero —, y además Vercel lo
  dispara en cualquier momento DENTRO de esa hora para repartir carga. Nada de
  eso importa acá: contra un límite de 7 días, una vez por día sobra.

  Usa el cliente público (anon key, respeta RLS) a propósito. Este endpoint
  está expuesto a internet; no hay ninguna razón para que tenga los permisos
  de la service role. Lee la misma view que ve cualquier visitante.
*/

export async function GET(request: NextRequest) {
  /*
    Vercel manda el CRON_SECRET del proyecto como `Authorization: Bearer ...`.

    OJO CON LA DECISIÓN DE ACÁ: el ejemplo de la documentación de Vercel
    devuelve 401 cuando CRON_SECRET no está configurado. Para este caso eso
    está MAL. Si alguien se olvida de cargar la variable en Vercel, el cron
    empezaría a recibir 401, nunca tocaría Supabase, el proyecto se pausaría
    igual, y el único rastro sería un log que nadie mira. El modo de falla
    silencioso es exactamente lo que este archivo viene a evitar.

    Entonces: si hay secreto, se exige. Si no hay, se deja pasar y se avisa en
    la respuesta y en el log. El riesgo de dejarlo abierto es despreciable —
    es una lectura de solo lectura sobre datos públicos, más barata que cargar
    la home, que cualquiera puede pedir las veces que quiera.
  */
  const secreto = process.env.CRON_SECRET
  const autorizacion = request.headers.get('authorization')

  if (secreto && autorizacion !== `Bearer ${secreto}`) {
    return Response.json({ ok: false, error: 'no autorizado' }, { status: 401 })
  }
  if (!secreto) {
    console.warn('[mantener-activo] CRON_SECRET no está configurado: endpoint abierto')
  }

  // count + head: no trae ninguna fila, solo el número. Es la lectura más
  // barata posible que igual obliga a la base a responder.
  const { count, error } = await supabase
    .from('propiedades_publicas')
    .select('*', { count: 'exact', head: true })

  if (error) {
    // 500 a propósito: así queda en rojo en los logs de Cron Jobs de Vercel.
    // Un ping que falla en silencio no sirve para nada.
    console.error('[mantener-activo] Supabase no respondió:', error.message)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  return Response.json({
    ok: true,
    autenticado: Boolean(secreto),
    propiedades: count,
    cuando: new Date().toISOString(),
  })
}
