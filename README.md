# Sistema web — PF Negocios Inmobiliarios

Web pública + panel de administración (+ asistente virtual, en desarrollo) para
PF Negocios Inmobiliarios, Tacuarembó. Una sola base de datos: el panel escribe,
la web lee, el asistente va a consultar.

**Producción:** https://inmobiliaria-pi-vert.vercel.app (auto-deploy desde `main`)

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres,
Auth, Storage) · Vercel. Sin dependencias extra: la decisión de diseño es que
todo el código sea explicable línea por línea.

## Correr en local

```bash
npm install
npm run dev
```

Necesita `.env.local` (no está en git) con:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # SOLO servidor, jamás en NEXT_PUBLIC_*
```

## Mapa del código

```
src/
  proxy.ts               # protege /admin (en Next 16, middleware = proxy)
  app/
    (public)/            # web pública: home, ficha de propiedad
    login/               # login del panel (email + contraseña)
    admin/               # panel: listado + alta de propiedades
  components/
    ui/                  # Badge, ErrorBox, BrandMark, WhatsAppLink
    propiedades/         # tarjeta, specs, filtros, placeholder de foto
    admin/               # dropzone de fotos
  lib/
    supabase.ts          # cliente anon + cliente service_role (solo servidor)
    supabase-server.ts   # cliente atado a cookies (Server Components/Actions)
    supabase-browser.ts  # cliente del navegador (subida de fotos)
    queries.ts           # TODAS las lecturas públicas (van a la view, no a la tabla)
    types.ts             # tipos del esquema real
    format.ts            # precios es-UY, specs urbano/rural, links de WhatsApp
```

## La regla de seguridad que explica todo el diseño

El público **no puede leer la tabla `propiedades`**: lee la view
`propiedades_publicas`, que devuelve `precio = null` cuando
`precio_publico = false` (y anula dirección/coordenadas/padrón cuando
`mostrar_direccion = false`). RLS filtra filas, no columnas — por eso es una
view y no una política. El SQL vive en `docs/sql/`, la verificación en
`scripts/verify-setup.mjs`:

```bash
node scripts/verify-setup.mjs   # 12 checks: anon bloqueado, view filtrando, panel operando
node scripts/setup-dev.mjs      # bucket + config + usuario de prueba (idempotente)
```

Caso de prueba permanente: **TB-004** tiene precio cargado en la tabla y la API
pública lo devuelve null. No borrarla nunca.

## Documentos

- `docs/specs/` — diseños aprobados antes de construir cada tanda
- `docs/sql/` — cambios de base de datos, fechados, para el editor SQL de Supabase
- `docs/testing/` — qué se verificó y cómo, por fecha

## Estado (13/8/2026)

Hecho: web pública (home + filtros + ficha + WhatsApp + OG), login con
contraseña, panel con listado y alta con fotos drag & drop, guardrail
estructural verificado. Pendiente: edición/borrado de propiedades, página
institucional/contacto (F5), asistente virtual (F6-F7), avisos por email (F8),
legales y SEO fino (F9).
