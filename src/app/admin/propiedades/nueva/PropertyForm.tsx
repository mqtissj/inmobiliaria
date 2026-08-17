'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  CARACTERISTICAS,
  esAlquilerOTraspaso,
  esRural,
  IDEAL_PARA,
  TIPOS_PATIO,
  TIPOS_PROPIEDAD,
  type Propiedad,
  type PropiedadFoto,
} from '@/lib/types'
import { PhotoDropzone, type FotoElegida } from '@/components/admin/PhotoDropzone'
import {
  actualizarPropiedad,
  borrarFoto,
  crearPropiedad,
  registrarFotos,
  type EstadoGuardar,
} from '../actions'

/*
  Un solo formulario para alta y edición (si las reglas viven dos veces,
  divergen). En edición recibe la propiedad y sus fotos actuales.

  Flujo al guardar:
   1. La Server Action crea/actualiza (valida sesión y datos en el servidor).
   2. El NAVEGADOR sube las fotos nuevas directo al bucket (límite de 1 MB
      en las actions; los archivos no pasan por el servidor de Next).
   3. Otra action registra las URLs y revalida la web pública.
  Las fotos EXISTENTES se borran al toque con su botón (con confirmación) —
  no esperan al guardado, para que lo que ves sea lo que hay.
*/
const estadoInicial: EstadoGuardar = { error: null }

// Garantías con las que PF trabaja de verdad (PREGUNTAS.txt del 17/8 a la
// noche): corredores de MAPFRE y SURA —las principales—, también Porto Seguro
// y Sancor. ANDA y Contaduría (CGN) NO se trabajan: fuera de las opciones.
// El Depósito queda como opción por propiedad (la corrección de la tarde dijo
// que sí lo aceptan) aunque salió de los textos públicos de la web.
const GARANTIAS = [
  'MAPFRE',
  'SURA',
  'Porto Seguro',
  'Sancor',
  'Garantía propietaria',
  'Depósito',
]

const claseInput =
  'mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-pf-blue'
const claseLabel = 'block text-sm font-semibold text-ink'
const claseCheck = 'flex items-center gap-2 text-sm text-ink'

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-line-soft bg-surface p-5">
      <legend className="px-1 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
        {titulo}
      </legend>
      {children}
    </fieldset>
  )
}

export function PropertyForm({
  propiedad,
  fotosExistentes = [],
}: {
  propiedad?: Propiedad
  fotosExistentes?: PropiedadFoto[]
}) {
  const editando = !!propiedad
  const router = useRouter()
  const [estado, accion, enviando] = useActionState(
    editando ? actualizarPropiedad : crearPropiedad,
    estadoInicial
  )

  const [tipo, setTipo] = useState(propiedad?.tipo ?? 'casa')
  const [operacion, setOperacion] = useState<string>(propiedad?.operacion ?? 'venta')
  const [fotos, setFotos] = useState<FotoElegida[]>([])
  const [actuales, setActuales] = useState<PropiedadFoto[]>(fotosExistentes)
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const [errorFotos, setErrorFotos] = useState<string | null>(null)
  const [borrando, startBorrado] = useTransition()
  const yaProceso = useRef(false)

  const rural = esRural(tipo)

  /*
    Repoblado después de un intento fallido.
    React 19 resetea el <form> en CADA envío (ver el comentario de EstadoGuardar
    en ../actions): pide el reset antes de correr la action y lo aplica al
    terminar, salga bien o mal. Como casi todos los campos de acá son no
    controlados, sin esto un error de validación borraba todo lo cargado — y en
    la edición devolvía los valores viejos de la base.
    La action fallida devuelve `intento` + `valores`. El `key={intento}` de abajo
    remonta el <form> y estos tres helpers le dan como defaults lo último
    enviado. Remontar es además lo que arregla los <select>: cambiarle el
    defaultValue a un select ya montado no mueve la opción seleccionada.
  */
  const v = (campo: string) => estado.valores?.simples[campo]
  // Un checkbox destildado NO viaja en el FormData. Por eso, si hubo intento,
  // "no está" significa destildado: no hay que caer al valor de la propiedad.
  const marcado = (campo: string, siNoHuboIntento: boolean | null | undefined) =>
    estado.valores ? estado.valores.simples[campo] === 'on' : !!siNoHuboIntento
  const enLista = (
    campo: 'tipos_garantia' | 'ideal_para' | 'caracteristicas',
    valor: string,
    siNoHuboIntento?: boolean
  ) => (estado.valores ? estado.valores.listas[campo].includes(valor) : !!siNoHuboIntento)

  /*
    Los blob: de las miniaturas los libera ACÁ, que es quien tiene el estado.
    Antes esa limpieza vivía dentro de PhotoDropzone, pero ahora el <form> se
    remonta en cada intento fallido: si siguiera en el hijo, cada error revocaría
    las previews y las fotos elegidas quedarían como miniaturas rotas.
  */
  const fotosVigentes = useRef<FotoElegida[]>([])
  useEffect(() => {
    fotosVigentes.current = fotos
  }, [fotos])
  useEffect(() => () => fotosVigentes.current.forEach((f) => URL.revokeObjectURL(f.preview)), [])

  // Al confirmar la action: subir las fotos nuevas y volver al listado.
  useEffect(() => {
    if (!estado.ok || yaProceso.current) return
    yaProceso.current = true
    const { id, codigo } = estado.ok

    async function subirFotosNuevas() {
      let fallidas = 0

      if (fotos.length > 0) {
        const supabase = supabaseBrowser()
        const subidas: { url: string; orden: number; es_portada: boolean }[] = []
        const base = actuales.length // las nuevas van después de las que ya había

        for (let i = 0; i < fotos.length; i++) {
          setSubiendo(`Subiendo foto ${i + 1} de ${fotos.length}…`)
          const file = fotos[i].file
          const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
          const ruta = `${codigo.toLowerCase()}/${Date.now()}-${i}.${ext}`

          const { error } = await supabase.storage.from('fotos-propiedades').upload(ruta, file, {
            contentType: file.type,
          })
          if (error) {
            fallidas++
            continue
          }
          const { data } = supabase.storage.from('fotos-propiedades').getPublicUrl(ruta)
          subidas.push({
            url: data.publicUrl,
            orden: base + i,
            es_portada: actuales.length === 0 && subidas.length === 0,
          })
        }

        if (subidas.length > 0) {
          setSubiendo('Vinculando fotos…')
          const res = await registrarFotos(id, codigo, subidas)
          if (res.error) fallidas = fotos.length
        }
      }

      const q = fallidas > 0 ? '&fotos=error' : ''
      router.push(`/admin?${editando ? 'editada' : 'creada'}=${codigo}${q}`)
      router.refresh()
    }

    /*
      El catch NO es decorativo: sin él, cualquier excepción acá adentro (se
      cortó internet en medio de una subida, el bucket rechazó el archivo,
      registrarFotos falló) dejaba `subiendo` pegado en un texto para siempre.
      Y como el botón usa `disabled={enviando || subiendo !== null}`, el usuario
      quedaba mirando "Subiendo foto 2 de 5…" con el botón muerto y la
      propiedad YA GUARDADA en la base — sin forma de salir salvo recargar,
      creyendo que no se guardó nada.

      La propiedad ya está creada en este punto, así que el error solo afecta a
      las fotos: se avisa y se sigue al listado, que es lo que el usuario quiere.
    */
    subirFotosNuevas().catch((e) => {
      console.error('[PropertyForm] falló la subida de fotos:', e)
      setSubiendo(null)
      setErrorFotos(
        'La propiedad se guardó, pero las fotos no se pudieron subir. Entrá a editarla y probá de nuevo.'
      )
      yaProceso.current = false
    })
  }, [estado.ok, fotos, actuales.length, editando, router])

  const quitarExistente = (foto: PropiedadFoto) => {
    if (!propiedad) return
    if (!window.confirm('¿Borrar esta foto? Se saca de la web al instante.')) return
    startBorrado(async () => {
      const res = await borrarFoto(foto.id, propiedad.codigo)
      if (res.error) {
        setErrorFotos(res.error)
      } else {
        setActuales((prev) => prev.filter((f) => f.id !== foto.id))
      }
    })
  }

  const ocupado = enviando || subiendo !== null

  return (
    // key = intento: cada fallo remonta el formulario con lo enviado como
    // defaults, en vez de dejar que el reset de React lo vacíe.
    <form key={estado.intento ?? 0} action={accion} className="space-y-5">
      {editando && (
        <>
          <input type="hidden" name="id" value={propiedad.id} />
          <input type="hidden" name="codigo_anterior" value={propiedad.codigo} />
        </>
      )}

      {estado.error && (
        <div className="rounded-md border border-pf-coral/40 bg-pf-coral-soft/50 px-4 py-3 text-sm">
          <p className="font-semibold text-ink">No se pudo guardar la propiedad</p>
          <p className="mt-0.5 text-ink-soft">{estado.error}</p>
        </div>
      )}
      {errorFotos && (
        <div className="rounded-md border border-pf-coral/40 bg-pf-coral-soft/50 px-4 py-3 text-sm">
          <p className="font-semibold text-ink">Ojo con las fotos</p>
          <p className="mt-0.5 text-ink-soft">{errorFotos}</p>
        </div>
      )}

      <Seccion titulo="Lo básico">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="codigo" className={claseLabel}>
              Código
            </label>
            <input
              id="codigo"
              name="codigo"
              required
              // Mismo regex que valida el servidor (actions.ts). Repetirlo acá
              // no reemplaza al del servidor: evita el viaje de ida y vuelta.
              pattern="[A-Za-z0-9\-]{2,20}"
              title="Entre 2 y 20 caracteres: letras, números y guiones (ej.: TB-005)"
              placeholder="TB-005"
              defaultValue={v('codigo') ?? propiedad?.codigo}
              className={claseInput}
            />
          </div>
          <div>
            <label htmlFor="titulo" className={claseLabel}>
              Título
            </label>
            <input
              id="titulo"
              name="titulo"
              required
              placeholder="Casa 3 dormitorios con fondo"
              defaultValue={v('titulo') ?? propiedad?.titulo}
              className={claseInput}
            />
          </div>
          <div>
            <label htmlFor="operacion" className={claseLabel}>
              Operación
            </label>
            <select
              id="operacion"
              name="operacion"
              value={operacion}
              onChange={(e) => setOperacion(e.target.value)}
              className={claseInput}
            >
              <option value="venta">Venta</option>
              <option value="alquiler">Alquiler</option>
              <option value="traspaso">Traspaso (de alquiler)</option>
            </select>
          </div>
          <div>
            <label htmlFor="tipo" className={claseLabel}>
              Tipo
            </label>
            <select
              id="tipo"
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className={claseInput}
            >
              {TIPOS_PROPIEDAD.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="estado" className={claseLabel}>
              Estado
            </label>
            <select
              id="estado"
              name="estado"
              defaultValue={v('estado') ?? propiedad?.estado ?? 'disponible'}
              className={claseInput}
            >
              <option value="disponible">Disponible (se ve en la web)</option>
              <option value="reservada">Reservada (se ve en la web)</option>
              <option value="vendida">Vendida (no se publica)</option>
              <option value="alquilada">Alquilada (no se publica)</option>
            </select>
          </div>
          <label className={`${claseCheck} mt-6`}>
            <input
              type="checkbox"
              name="destacada"
              defaultChecked={marcado('destacada', propiedad?.destacada)}
              className="h-4 w-4 accent-pf-blue"
            />
            Destacada (aparece primera en la web)
          </label>
        </div>
      </Seccion>

      <Seccion titulo="Ubicación">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ciudad" className={claseLabel}>
              Ciudad
            </label>
            <input
              id="ciudad"
              name="ciudad"
              defaultValue={v('ciudad') ?? propiedad?.ciudad ?? 'Tacuarembó'}
              className={claseInput}
            />
          </div>
          <div>
            <label htmlFor="barrio" className={claseLabel}>
              Barrio o zona
            </label>
            <input
              id="barrio"
              name="barrio"
              placeholder="Centro, López, Ruta 26…"
              defaultValue={v('barrio') ?? propiedad?.barrio ?? ''}
              className={claseInput}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="direccion" className={claseLabel}>
              Dirección exacta
            </label>
            <input
              id="direccion"
              name="direccion"
              defaultValue={v('direccion') ?? propiedad?.direccion ?? ''}
              className={claseInput}
            />
            <label className={`${claseCheck} mt-2`}>
              <input
                type="checkbox"
                name="mostrar_direccion"
                defaultChecked={marcado('mostrar_direccion', propiedad?.mostrar_direccion)}
                className="h-4 w-4 accent-pf-blue"
              />
              Mostrar la dirección exacta en la web (si no, se coordina por WhatsApp)
            </label>
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Precio">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="precio" className={claseLabel}>
              Precio
            </label>
            <input
              id="precio"
              name="precio"
              inputMode="numeric"
              placeholder="135000"
              defaultValue={v('precio') ?? propiedad?.precio ?? ''}
              className={claseInput}
            />
          </div>
          <div>
            <label htmlFor="moneda" className={claseLabel}>
              Moneda
            </label>
            <select
              id="moneda"
              name="moneda"
              defaultValue={v('moneda') ?? propiedad?.moneda ?? 'USD'}
              className={claseInput}
            >
              <option value="USD">USD (dólares)</option>
              <option value="UYU">UYU (pesos)</option>
            </select>
          </div>
          <div>
            <label htmlFor="gastos_comunes" className={claseLabel}>
              Gastos comunes ($U)
            </label>
            <input
              id="gastos_comunes"
              name="gastos_comunes"
              inputMode="numeric"
              defaultValue={v('gastos_comunes') ?? propiedad?.gastos_comunes ?? ''}
              className={claseInput}
            />
          </div>
        </div>
        <label className={`${claseCheck} mt-3`}>
          <input
            type="checkbox"
            name="precio_publico"
            defaultChecked={marcado('precio_publico', propiedad ? propiedad.precio_publico : true)}
            className="h-4 w-4 accent-pf-blue"
          />
          Publicar el precio (si lo destildás, la web y el asistente dicen “consultar” — el número
          nunca sale del sistema)
        </label>
      </Seccion>

      {rural ? (
        <Seccion titulo="Datos del campo">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="hectareas" className={claseLabel}>
                Hectáreas
              </label>
              <input
                id="hectareas"
                name="hectareas"
                inputMode="decimal"
                placeholder="120"
                defaultValue={v('hectareas') ?? propiedad?.hectareas ?? ''}
                className={claseInput}
              />
            </div>
            <div>
              <label htmlFor="indice_coneat" className={claseLabel}>
                Índice CONEAT
              </label>
              <input
                id="indice_coneat"
                name="indice_coneat"
                inputMode="numeric"
                placeholder="98"
                defaultValue={v('indice_coneat') ?? propiedad?.indice_coneat ?? ''}
                className={claseInput}
              />
            </div>
            <div>
              <label htmlFor="padron" className={claseLabel}>
                Padrón
              </label>
              <input
                id="padron"
                name="padron"
                defaultValue={v('padron') ?? propiedad?.padron ?? ''}
                className={claseInput}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-5">
            <label className={claseCheck}>
              <input type="checkbox" name="tiene_agua" defaultChecked={marcado('tiene_agua', propiedad?.tiene_agua)} className="h-4 w-4 accent-pf-blue" />
              Tiene agua
            </label>
            <label className={claseCheck}>
              <input type="checkbox" name="tiene_luz" defaultChecked={marcado('tiene_luz', propiedad?.tiene_luz)} className="h-4 w-4 accent-pf-blue" />
              Tiene luz
            </label>
            <label className={claseCheck}>
              <input type="checkbox" name="alambrado" defaultChecked={marcado('alambrado', propiedad?.alambrado)} className="h-4 w-4 accent-pf-blue" />
              Alambrado
            </label>
          </div>
        </Seccion>
      ) : (
        <Seccion titulo="Datos de la construcción">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="dormitorios" className={claseLabel}>
                Dormitorios
              </label>
              <input id="dormitorios" name="dormitorios" inputMode="numeric" defaultValue={v('dormitorios') ?? propiedad?.dormitorios ?? ''} className={claseInput} />
            </div>
            <div>
              <label htmlFor="banos" className={claseLabel}>
                Baños
              </label>
              <input id="banos" name="banos" inputMode="numeric" defaultValue={v('banos') ?? propiedad?.banos ?? ''} className={claseInput} />
            </div>
            <div>
              <label htmlFor="plantas" className={claseLabel}>
                Plantas
              </label>
              <input id="plantas" name="plantas" inputMode="numeric" defaultValue={v('plantas') ?? propiedad?.plantas ?? ''} className={claseInput} />
            </div>
            <div>
              <label htmlFor="m2_edificados" className={claseLabel}>
                M² edificados
              </label>
              <input id="m2_edificados" name="m2_edificados" inputMode="decimal" defaultValue={v('m2_edificados') ?? propiedad?.m2_edificados ?? ''} className={claseInput} />
            </div>
            <div>
              <label htmlFor="m2_terreno" className={claseLabel}>
                M² de terreno
              </label>
              <input id="m2_terreno" name="m2_terreno" inputMode="decimal" defaultValue={v('m2_terreno') ?? propiedad?.m2_terreno ?? ''} className={claseInput} />
            </div>
            {/* El garaje se movió abajo, al grupo "Cochera" (17/8) */}
          </div>
          {/* Exterior, cochera y comodidades: alimentan los filtros que pidió
              el cliente el 17/8. Cada uno tildado acá es un chip que aparece
              solo en la web — si ninguna propiedad tiene parrillero, no hay
              filtro de parrillero. */}
          <div className="mt-5 border-t border-line-soft pt-4">
            <div className="max-w-xs">
              <label htmlFor="patio" className={claseLabel}>
                Patio
              </label>
              <select
                id="patio"
                name="patio"
                defaultValue={v('patio') ?? propiedad?.patio ?? ''}
                className={claseInput}
              >
                <option value="">No tiene patio</option>
                {TIPOS_PATIO.map((t) => (
                  <option key={t} value={t}>
                    Patio {t}
                  </option>
                ))}
              </select>
            </div>

            {(Object.keys(CARACTERISTICAS) as (keyof typeof CARACTERISTICAS)[]).map((grupo) => (
              <div key={grupo} className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                  {grupo}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                  {CARACTERISTICAS[grupo].map((c) => (
                    <label key={c.valor} className={claseCheck}>
                      <input
                        type="checkbox"
                        name="caracteristicas"
                        value={c.valor}
                        defaultChecked={enLista(
                          'caracteristicas',
                          c.valor,
                          propiedad?.caracteristicas?.includes(c.valor)
                        )}
                        className="h-4 w-4 accent-pf-blue"
                      />
                      {c.etiqueta}
                    </label>
                  ))}
                  {/* El garaje vive en su propia columna desde F0, por eso está
                      acá suelto y no en la lista de arriba. En la web se ve
                      junto a "Cochera" igual. */}
                  {grupo === 'Cochera' && (
                    <label className={claseCheck}>
                      <input
                        type="checkbox"
                        name="garage"
                        defaultChecked={marcado('garage', propiedad?.garage)}
                        className="h-4 w-4 accent-pf-blue"
                      />
                      Garaje
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Alimenta el filtro "Para familia / Para pareja" de la web (pedido
              del cliente, 17/8). Pueden ir las dos: no son excluyentes. */}
          <div className="mt-4 border-t border-line-soft pt-4 flex flex-wrap gap-5">
            {IDEAL_PARA.map((valor) => (
              <label key={valor} className={claseCheck}>
                <input
                  type="checkbox"
                  name="ideal_para"
                  value={valor}
                  defaultChecked={enLista('ideal_para', valor, propiedad?.ideal_para?.includes(valor))}
                  className="h-4 w-4 accent-pf-blue"
                />
                Ideal para {valor}
              </label>
            ))}
          </div>
        </Seccion>
      )}

      {esAlquilerOTraspaso(operacion) && (
        <Seccion titulo="Condiciones del alquiler">
          <label className={claseCheck}>
            <input
              type="checkbox"
              name="requiere_garantia"
              defaultChecked={marcado('requiere_garantia', propiedad ? propiedad.requiere_garantia : true)}
              className="h-4 w-4 accent-pf-blue"
            />
            Requiere garantía
          </label>
          <div className="mt-3 flex flex-wrap gap-4">
            {GARANTIAS.map((g) => (
              <label key={g} className={claseCheck}>
                <input
                  type="checkbox"
                  name="tipos_garantia"
                  value={g}
                  defaultChecked={enLista('tipos_garantia', g, propiedad?.tipos_garantia?.includes(g))}
                  className="h-4 w-4 accent-pf-blue"
                />
                {g}
              </label>
            ))}
          </div>
          <label className={`${claseCheck} mt-3`}>
            <input
              type="checkbox"
              name="acepta_mascotas"
              defaultChecked={marcado('acepta_mascotas', propiedad?.acepta_mascotas)}
              className="h-4 w-4 accent-pf-blue"
            />
            Acepta mascotas
          </label>
        </Seccion>
      )}

      <Seccion titulo="Descripción">
        <textarea
          name="descripcion"
          rows={4}
          placeholder="Lo que le contarías a un interesado: estado, entorno, qué la hace valer la pena…"
          defaultValue={v('descripcion') ?? propiedad?.descripcion ?? ''}
          className={claseInput}
        />
      </Seccion>

      <Seccion titulo="Fotos">
        {actuales.length > 0 && (
          <>
            <p className="mb-2 text-sm text-ink-soft">
              Las que ya están publicadas — borrarlas las saca de la web al instante:
            </p>
            <ul className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {actuales.map((f, i) => (
                <li key={f.id} className="relative">
                  <Image
                    src={f.url}
                    alt={`Foto publicada ${i + 1}`}
                    width={160}
                    height={160}
                    className="aspect-square w-full rounded-md border border-line-soft object-cover"
                  />
                  {f.es_portada && (
                    <span className="absolute left-1 top-1 rounded-full bg-pf-navy/80 px-2 py-0.5 text-[10px] font-bold uppercase text-surface">
                      portada
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => quitarExistente(f)}
                    disabled={borrando || ocupado}
                    aria-label={`Borrar foto publicada ${i + 1}`}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-pf-navy/80 text-xs font-bold text-surface transition-colors hover:bg-pf-coral"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <PhotoDropzone fotos={fotos} onChange={setFotos} deshabilitado={ocupado} />
      </Seccion>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={ocupado}
          className="rounded-md bg-pf-blue px-6 py-2.5 font-semibold text-surface transition-colors hover:bg-pf-navy disabled:cursor-not-allowed disabled:opacity-60"
        >
          {subiendo ?? (enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear propiedad')}
        </button>
        {ocupado && <p className="text-sm text-ink-faint">No cierres esta pestaña…</p>}
      </div>
    </form>
  )
}
