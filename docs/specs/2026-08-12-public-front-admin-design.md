# Diseño: web pública + login + alta de propiedades

**Fecha:** 12/8/2026 · **Estado:** construido y verificado el 13/8 (ver docs/testing/2026-08-13-verificacion.md). Se sumaron a pedido: responsive móvil→PC, /privacidad y /terminos en el footer, y multifoto verificado con 3 archivos.
**Cubre:** F1 (login), F2 parcial (listado + alta), F3 (fotos), F4 (web pública). El bot (F6-F7) queda explícitamente afuera.

---

## 1. Qué se construye

| Pieza | Qué incluye |
|---|---|
| Web pública | Home con hero + listado de propiedades con filtros (operación, tipo) · ficha de propiedad · botón de consulta por WhatsApp · link a Instagram |
| Login | Página de login email + contraseña · protección de `/admin` vía `proxy.ts` |
| Panel | Tabla de propiedades (estilo mockup) · formulario de alta con campos condicionales urbano/rural · drag & drop de fotos |

**Qué NO entra en esta tanda:** el asistente virtual, notificaciones por email (Resend), edición y borrado de propiedades (solo alta — edición en la iteración siguiente), formulario para propietarios (F5), deploy en Vercel.

---

## 2. Decisiones y porqués

1. **Login con contraseña, no magic link** (cambia lo que decía CLAUDE.md, decidido con el usuario el 12/8):
   el usuario real no es técnico. El magic link mete al correo en el camino de cada login (spam, demoras,
   y la trampa de abrir el link en el celular dejando la sesión en el dispositivo equivocado). Con contraseña:
   el navegador la recuerda, la sesión de Supabase dura días, y el mail queda solo para recuperación.

2. **View `propiedades_publicas` para el público**: hoy la política RLS de `anon` deja leer la tabla
   `propiedades` entera, columna `precio` incluida. Con los datos de prueba no se filtra nada porque
   TB-004 tiene `precio = null` — pero el día que la inmobiliaria cargue un campo con precio real y
   `precio_publico = false`, cualquiera con la consola del navegador y la anon key lo consulta directo,
   aunque el HTML no lo muestre. RLS filtra filas, no columnas, así que el arreglo estructural es una view
   donde `precio = CASE WHEN precio_publico THEN precio ELSE NULL END`, dar permiso a `anon` solo sobre
   la view, y sacarle el SELECT directo a la tabla. Mismo espíritu que el guardrail del bot (§4.2 de CLAUDE.md).
   **Test de aceptación:** se le carga un precio a TB-004, y desde la consola del navegador con la anon key
   `select precio` devuelve null o error. Nunca el número.

3. **Escritura del panel vía RLS para `authenticated`**: el panel escribe con la sesión del usuario
   logueado (no con service_role). Hay que verificar qué políticas existen y agregar las que falten
   (INSERT/UPDATE en `propiedades` y `propiedad_fotos` para `authenticated`). Así RLS queda como única
   autoridad de acceso — más simple de razonar y de defender que lógica de permisos en el servidor.

4. **Serif en títulos, sans en el resto**: el logo de PF es serif; REGLAS-CLAUDE.md pide "sin serif
   salvo pedido" y el usuario lo pidió explícitamente para títulos. Display: **Source Serif 4**
   (vía `next/font/google`, self-hosted al build, sin CDN en runtime). Cuerpo: **Geist** (ya está en el
   proyecto). Cero librerías nuevas.

5. **Sin librerías nuevas, punto.** Drag & drop con eventos nativos, filtros con searchParams,
   componentes propios estilo mockup. Todo el código es explicable en la defensa.

6. **WhatsApp como canal de consulta**: botón por propiedad → `https://wa.me/59898756490?text=<prellenado con código y título>`.
   El número confirmado por el usuario (es el del linktree de Instagram de PF). Instagram:
   `https://www.instagram.com/pf_negocios_inmobiliarios/` en header/footer.

7. **`config_negocio` con datos reales**: hoy tiene `[NOMBRE]`, `[DIRECCIÓN]`, `[TELÉFONO]`.
   Se cargan: nombre "PF Negocios Inmobiliarios", dirección "25 de Mayo 329, Tacuarembó",
   teléfono "098 756 490", y claves nuevas `whatsapp` (59898756490) e `instagram`
   (pf_negocios_inmobiliarios). La web lee de ahí, no hardcodea.

---

## 3. Rutas y archivos

```
src/
  app/
    (public)/
      layout.tsx                      # header con logo/nav/CTA WhatsApp + footer con IG, horario, dirección
      page.tsx                        # home: hero + filtros + grilla de cards
      propiedades/[codigo]/page.tsx   # ficha: galería, specs condicionales, CTA WhatsApp
    login/page.tsx                    # form de login (noindex)
    admin/
      layout.tsx                      # barra del panel + botón salir (noindex)
      page.tsx                        # tabla de propiedades
      propiedades/nueva/page.tsx      # form de alta + fotos
    api/  (queda para el bot, no se toca)
    layout.tsx                        # root: lang es-UY, fuentes, metadata base + OG
    proxy.ts                          # redirige a /login si no hay sesión en /admin
  components/
    ui/                               # Button, Input, Select, Badge, ErrorBox
    propiedades/                      # PropertyCard, PropertyFilters, SpecGrid, PhotoDropzone, PriceTag
  lib/
    supabase.ts                       # existente (anon + admin service_role)
    supabase-browser.ts               # cliente browser con @supabase/ssr (cookies)
    supabase-server.ts                # cliente server con @supabase/ssr (cookies)
    types.ts                          # tipos de la BD (a mano desde el esquema real verificado)
    format.ts                         # precio es-UY, specs urbano/rural
```

Server Components por defecto. `"use client"` solo en: filtros, form de login, form de alta, dropzone.

**Nota Next 16:** `middleware.ts` ahora se llama `proxy.ts`; los `params` de rutas dinámicas son Promise.
Antes de escribir `proxy.ts` y el auth, leer `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
y `02-guides/authentication.md` (obligatorio por AGENTS.md — Next 16 cambió cosas respecto a lo que "se sabe").

---

## 4. Datos

- **Lectura pública:** view `propiedades_publicas` (todas las columnas menos precio condicionado;
  también respeta `mostrar_direccion` anulando `direccion`, `lat`, `lng` cuando es false, y solo
  filas con estado disponible/reservada). Fotos: `propiedad_fotos` con URL pública del bucket.
- **Escritura panel:** INSERT en `propiedades` y `propiedad_fotos` con el usuario `authenticated` (RLS).
- **Fotos:** bucket `fotos-propiedades` — lectura pública, INSERT solo `authenticated`,
  límite 5 MB por archivo, solo imágenes. Path: `<codigo>/<n>.<ext>`.
- **SQL nuevo:** todo el SQL (view, políticas, bucket) queda en `docs/sql/2026-08-12-public-view-and-panel-policies.sql`
  para correr en el editor SQL de Supabase — el proyecto no tiene migraciones y no vamos a inventar
  un sistema de migraciones para esto (sobreingeniería); un archivo fechado por cambio alcanza.
- **Usuario del panel:** lo crea el usuario en el dashboard de Supabase (Authentication → Add user)
  con los datos que le pase la inmobiliaria. Para desarrollo: `admin@pf-test.uy` / contraseña de prueba.

## 5. UI

- **Paleta PF** (tokens en `globals.css` vía `@theme`): azul `#1C5FA6`, marino `#161D2E`,
  celeste `#1E7C9C`, coral `#E8836E` (acento mínimo: badges/CTA secundario), grises fríos derivados.
  A confirmar contra el manual de marca si el cliente lo tiene (pregunta F1 del cuestionario enviado).
- **Tipografía:** Source Serif 4 en h1/h2/precios destacados; Geist en todo lo demás;
  `tabular-nums` en precios y tablas.
- **Componentes del mockup aprobado:** card con badge disponible/reservada, "Consultar precio"
  cuando `precio_publico = false`, specs urbano (dorm/m²) vs rural (há/CONEAT/agua) condicionales,
  tabla admin sobria, dropzone punteada.
- **Reglas anti-plantilla (REGLAS-CLAUDE.md):** números reales (4 propiedades reales de la base, no
  "cientos de propiedades"), sin secciones de relleno ni testimonios inventados, un solo patrón de
  card (no repetir el mismo bloque dos veces), OG completo, voseo, acentos revisados.

## 6. Errores

Cada error de cara al usuario lleva: qué pasó + qué hacer + botón de reintentar cuando aplica.
- Login fallido: "Mail o contraseña incorrectos. Revisá e intentá de nuevo." (sin distinguir cuál, por seguridad)
- Alta fallida: se conserva lo tipeado, error arriba del form con reintentar.
- Fotos: archivo no imagen o >5 MB → se rechaza ese archivo con motivo, el resto sigue.
- Listado público sin conexión a la base: mensaje humano + botón reintentar (no `<pre>` con el error crudo como está hoy).

## 7. Plan de construcción (un paso por vez, confirmás entre cada uno)

| # | Qué | Tocás y probás |
|---|---|---|
| 1 | Fundación visual: tokens PF, fuentes, layout público (header/footer), home con cards reales y filtros | `npm run dev` → home con las 4 propiedades |
| 2 | Ficha de propiedad + CTA WhatsApp + OG | Entrás a TB-004: sin precio, con CONEAT; el botón abre WhatsApp con texto prellenado |
| 3 | SQL (view + políticas + bucket), la web pasa a leer la view | Test de consola: precio de TB-004 inaccesible con anon |
| 4 | Login + proxy + tabla admin | Entrás con el usuario de prueba; sin sesión, /admin redirige |
| 5 | Alta de propiedad + fotos drag & drop | Cargás una propiedad de prueba con 2 fotos y aparece en la web |

## 8. Necesito de vos (cuando lo tengas)

- Datos reales del usuario de la inmobiliaria (mail — la contraseña la configuran juntos en la entrega).
- Confirmación de paleta/logo en alta del cliente (F1 del cuestionario).
- Fotos reales de las primeras propiedades.
- Nada que ver con el deploy: ya existe (inmobiliaria-pi-vert.vercel.app, auto-deploy desde `main`, plan Hobby). Solo queda pasarlo a Pro antes del uso comercial real. **Ojo:** como cada push a `main` va directo a producción, acá no se commitea ni pushea nada sin que lo pidas.
