# Verificación — 13/8/2026

Tanda: web pública + login + panel con alta y fotos. Todo lo de abajo se corrió
y PASÓ hoy; si algo se toca, volver a correr las dos baterías.

## 1. Batería de seguridad (`node scripts/verify-setup.mjs`) — 12/12 PASA

Simula tres roles contra la base real:

**Atacante con la anon key (la que viaja en el navegador):**
- No puede leer la tabla `propiedades` directo → `permission denied`
- La view devuelve `precio = null` de TB-004 aunque en la tabla vale 350.000
- La view devuelve `padron = null` cuando `mostrar_direccion = false`
- No puede insertar propiedades
- No puede subir archivos al bucket

**La web pública (anon vía view):**
- Lee el listado por `propiedades_publicas` (4 propiedades, 3 con precio, 1 en "consultar")
- Lee `config_negocio` para header/footer

**Usuario del panel (authenticated):**
- Login con contraseña funciona
- Lee la tabla completa y SÍ ve el precio real de TB-004
- Puede insertar propiedades y subir fotos al bucket

## 2. Recorrido en navegador (dev server local)

- Home: 4 propiedades, destacadas primero, chips de filtro derivados de los
  datos reales, TB-004 con specs rurales (há/CONEAT/agua) y "Consultar precio",
  FAQs reales, footer con datos de PF.
- Ficha TB-004: sin precio, sin padrón, sin dirección ("se coordina"), specs
  rurales, título OG por propiedad. Los 3 links de WhatsApp verificados — el de
  la ficha va prellenado: "Hola! Vi en la web la propiedad TB-004 (Campo 120
  hectáreas ganadero)…".
- `/admin` sin sesión → redirige a `/login` (proxy).
- Login con el usuario de prueba → tabla con precios reales y chip
  "precio oculto" en TB-004.
- **Alta de punta a punta:** se creó ZZ-UI1 con una foto por el dropzone
  (inyectada por el navegador), la Server Action insertó, el navegador subió la
  foto al bucket, `registrarFotos` la vinculó, redirect con banner "creada y
  publicada", la tabla mostró FOTOS = 1 y la ficha pública sirvió la foto desde
  Supabase vía next/image. Después se eliminó (fila + foto + archivo).
- Consola del navegador: cero errores en todo el recorrido.

## 3. Build

`npm run build` limpio: TypeScript sin errores, 7 rutas + proxy registrado.

## 4. Responsive (pedido del 13/8)

- Móvil 375×812: home (cards a una columna, chips envueltos, header en una
  línea tras ajuste de nowrap), ficha urbana (specs a 2 columnas), panel con
  tabla scrolleable horizontal, formulario de alta apilado.
- Escritorio 1568px: home a 3 columnas, ficha a 2 columnas con CTA sticky.
- Nota: el dev overlay marcó un "hydration mismatch" causado por una extensión
  del navegador (Video Speed Controller inyecta `vsc-initialized` en el body
  antes de que React hidrate). No es un bug del código: consola limpia en
  pestaña sin extensiones y React lo lista como causa externa conocida.

## 5. Multifoto (pedido del 13/8)

Alta de ZZ-UI2 con 3 fotos por el dropzone: 3 previews (primera marcada
portada), 3 archivos subidos al bucket, 3 filas en propiedad_fotos, tabla del
panel con FOTOS = 3 y galería pública sirviendo las 3 desde Supabase.
Eliminada al terminar. Límite visual conocido: la ficha muestra portada + 3
miniaturas; con más de 4 fotos, el resto queda sin galería completa
(lightbox pendiente para la próxima tanda).

## 6. Páginas legales (pedido del 13/8)

/privacidad y /terminos responden 200, linkeadas desde el footer. Redactadas
sobre lo que el sistema hace HOY (sin formularios ni analytics; datos solo por
WhatsApp; cookie únicamente en el panel interno) y citando la Ley 18.331.
Conviene que las revise alguien con criterio legal antes de la entrega formal.

## 7. Tanda 2 (13/8, tarde): edición, borrado, lightbox, contacto

- **Edición:** TB-001 editada desde el panel → banner "actualizada", tabla y
  web pública mostrando el cambio al instante (revalidatePath). Revertida después.
- **Borrado:** propiedad de prueba con foto eliminada desde la "zona peligrosa"
  (confirmación mediante) → fila, filas de fotos y archivo del bucket: todo en cero.
- **Lightbox:** propiedad con 5 fotos → grilla portada + 3 con "+1 fotos",
  visor abre con contador 1/5, flechas → 3/5, Esc cierra, scroll bloqueado y
  restaurado.
- **Contacto:** /contacto renderiza datos reales; el formulario de propietarios
  armó el WhatsApp estructurado esperado ("…para alquilar / Tipo: campo / Zona:
  Paso de los Toros / …") capturando window.open. No guarda nada — coherente
  con la política de privacidad.

## 8. Bug real encontrado y corregido por esta batería (13/8)

Al eliminar una propiedad, sus archivos quedaban HUÉRFANOS en el bucket:
`remove()` como `authenticated` devolvía **0 borrados sin error**, porque
borrar en Storage exige política de **SELECT** sobre `storage.objects` además
de la de DELETE. Arreglo triple:
1. Política "panel ve archivos de fotos" agregada (SQL actualizado en docs/sql/).
2. Las actions ahora VERIFICAN el resultado del remove: si queda basura, se
   avisa en el banner; borrar una foto individual no saca la fila si el archivo
   no se pudo borrar.
3. La batería ganó el check "panel puede BORRAR del bucket (y borra de verdad)"
   — cuenta lo borrado, no confía en la ausencia de error. **13/13 PASA.**

Yapa: el signOut() del script era global y tumbaba la sesión del navegador del
panel — ahora usa `scope: 'local'`.

## Pendiente de verificar más adelante

- Recuperación de contraseña (requiere configurar SMTP en Supabase — hoy no está)
- Comportamiento con 40+ propiedades (paginación no existe aún; con el volumen
  actual no hace falta)
- Open Graph en producción (pegar el link en un chat una vez pusheado)
