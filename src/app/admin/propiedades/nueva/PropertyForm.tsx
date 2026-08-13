'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { esRural, TIPOS_PROPIEDAD, type Propiedad, type PropiedadFoto } from '@/lib/types'
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

// Garantías que se manejan en Uruguay + las aseguradoras de las que PF es
// corredor oficial (SURA y Porto, según su propio Instagram).
const GARANTIAS = ['ANDA', 'Contaduría (CGN)', 'Garantía propietaria', 'SURA', 'Porto']

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

    subirFotosNuevas()
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
    <form action={accion} className="space-y-5">
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
              placeholder="TB-005"
              defaultValue={propiedad?.codigo}
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
              defaultValue={propiedad?.titulo}
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
              defaultValue={propiedad?.estado ?? 'disponible'}
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
              defaultChecked={propiedad?.destacada}
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
              defaultValue={propiedad?.ciudad ?? 'Tacuarembó'}
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
              defaultValue={propiedad?.barrio ?? ''}
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
              defaultValue={propiedad?.direccion ?? ''}
              className={claseInput}
            />
            <label className={`${claseCheck} mt-2`}>
              <input
                type="checkbox"
                name="mostrar_direccion"
                defaultChecked={propiedad?.mostrar_direccion}
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
              defaultValue={propiedad?.precio ?? ''}
              className={claseInput}
            />
          </div>
          <div>
            <label htmlFor="moneda" className={claseLabel}>
              Moneda
            </label>
            <select id="moneda" name="moneda" defaultValue={propiedad?.moneda ?? 'USD'} className={claseInput}>
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
              defaultValue={propiedad?.gastos_comunes ?? ''}
              className={claseInput}
            />
          </div>
        </div>
        <label className={`${claseCheck} mt-3`}>
          <input
            type="checkbox"
            name="precio_publico"
            defaultChecked={propiedad ? propiedad.precio_publico : true}
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
                defaultValue={propiedad?.hectareas ?? ''}
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
                defaultValue={propiedad?.indice_coneat ?? ''}
                className={claseInput}
              />
            </div>
            <div>
              <label htmlFor="padron" className={claseLabel}>
                Padrón
              </label>
              <input id="padron" name="padron" defaultValue={propiedad?.padron ?? ''} className={claseInput} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-5">
            <label className={claseCheck}>
              <input type="checkbox" name="tiene_agua" defaultChecked={!!propiedad?.tiene_agua} className="h-4 w-4 accent-pf-blue" />
              Tiene agua
            </label>
            <label className={claseCheck}>
              <input type="checkbox" name="tiene_luz" defaultChecked={!!propiedad?.tiene_luz} className="h-4 w-4 accent-pf-blue" />
              Tiene luz
            </label>
            <label className={claseCheck}>
              <input type="checkbox" name="alambrado" defaultChecked={!!propiedad?.alambrado} className="h-4 w-4 accent-pf-blue" />
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
              <input id="dormitorios" name="dormitorios" inputMode="numeric" defaultValue={propiedad?.dormitorios ?? ''} className={claseInput} />
            </div>
            <div>
              <label htmlFor="banos" className={claseLabel}>
                Baños
              </label>
              <input id="banos" name="banos" inputMode="numeric" defaultValue={propiedad?.banos ?? ''} className={claseInput} />
            </div>
            <div>
              <label htmlFor="plantas" className={claseLabel}>
                Plantas
              </label>
              <input id="plantas" name="plantas" inputMode="numeric" defaultValue={propiedad?.plantas ?? ''} className={claseInput} />
            </div>
            <div>
              <label htmlFor="m2_edificados" className={claseLabel}>
                M² edificados
              </label>
              <input id="m2_edificados" name="m2_edificados" inputMode="decimal" defaultValue={propiedad?.m2_edificados ?? ''} className={claseInput} />
            </div>
            <div>
              <label htmlFor="m2_terreno" className={claseLabel}>
                M² de terreno
              </label>
              <input id="m2_terreno" name="m2_terreno" inputMode="decimal" defaultValue={propiedad?.m2_terreno ?? ''} className={claseInput} />
            </div>
            <label className={`${claseCheck} mt-6`}>
              <input type="checkbox" name="garage" defaultChecked={!!propiedad?.garage} className="h-4 w-4 accent-pf-blue" />
              Garaje
            </label>
          </div>
        </Seccion>
      )}

      {operacion === 'alquiler' && (
        <Seccion titulo="Condiciones del alquiler">
          <label className={claseCheck}>
            <input
              type="checkbox"
              name="requiere_garantia"
              defaultChecked={propiedad ? !!propiedad.requiere_garantia : true}
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
                  defaultChecked={propiedad?.tipos_garantia?.includes(g)}
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
              defaultChecked={!!propiedad?.acepta_mascotas}
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
          defaultValue={propiedad?.descripcion ?? ''}
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
