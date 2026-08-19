-- =============================================================================
-- "Entrada para auto" como característica de cochera
-- Fecha: 19/8/2026 · Se corre en Supabase → SQL Editor → Run
-- Es seguro correrlo más de una vez.
--
-- POR QUÉ EXISTE ESTO:
-- Pedido del cliente (19/8): filtrar por cochera, garaje y entrada para auto.
-- Cochera y garaje ya existían ('cochera' en el array `caracteristicas`,
-- `garage` como columna propia de F0); lo único nuevo es 'entrada_auto'.
-- Como el vocabulario del array está cerrado por CHECK, agregar un valor es
-- recrear esa restricción. No se toca ninguna columna, ni el índice GIN, ni
-- la view pública: la view ya expone `caracteristicas` entera.
--
-- El nombre del constraint se verificó contra la base el 19/8 provocando una
-- violación a propósito (el mensaje de error lo trae): es el nombre por
-- defecto que Postgres le puso al CHECK inline del 17/8.
--
-- OJO — HASTA QUE ESTO NO CORRA: el panel ya muestra el casillero "Entrada
-- para auto". Si alguien lo marca antes de correr esto, la base rechaza el
-- guardado entero. Corré este SQL antes de (o junto con) el deploy.
-- =============================================================================

-- Un CHECK no se puede editar: se borra y se vuelve a crear con el valor nuevo.
-- Entre los dos ALTER no hay ventana peligrosa: se corren juntos en la misma
-- sesión y ningún dato existente viola el vocabulario nuevo (es un superset).
alter table public.propiedades
  drop constraint if exists propiedades_caracteristicas_check;

alter table public.propiedades
  add constraint propiedades_caracteristicas_check
  check (caracteristicas <@ array[
    -- exterior
    'fondo', 'parrillero', 'barbacoa',
    -- cochera (garage sigue como columna propia, ver docs/sql/2026-08-17-filtros-detallados.sql)
    'cochera', 'entrada_auto',
    -- comodidades
    'aire_acondicionado', 'calefaccion', 'estufa_lena', 'calefon', 'placares',
    -- baño
    'bano_completo'
  ]);

comment on column public.propiedades.caracteristicas is
  'Banderas de exterior, cochera, comodidades y baño completo. Vocabulario cerrado por CHECK. Última ampliación: docs/sql/2026-08-19-entrada-auto.sql';

-- Verificación después de correr esto:
--   node scripts/verify-setup.mjs
