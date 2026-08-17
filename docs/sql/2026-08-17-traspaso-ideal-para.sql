-- =============================================================================
-- Traspaso como operación + columna ideal_para (familia/pareja)
-- Fecha: 17/8/2026 · Se corre en Supabase → SQL Editor → Run
-- Es seguro correrlo más de una vez (if not exists en todo).
--
-- POR QUÉ EXISTE ESTO:
-- Pedido del cliente (17/8): filtrar por venta/alquiler/traspaso, y por
-- "para familia o pareja". Traspaso no existía como operación (TB-005 estaba
-- cargada como alquiler con "traspaso" en el título) y el público ideal no
-- tenía columna. Los filtros de la web se derivan de datos reales, así que
-- primero la base, después los chips.
--
-- OJO: acá NO se actualiza ninguna fila. Postgres no deja USAR un valor nuevo
-- de un enum en la misma transacción que lo crea, y el SQL Editor corre todo
-- este archivo como una sola transacción. El pase de TB-005 a traspaso se hace
-- después, por la API (script aparte).
-- =============================================================================

-- 1. 'traspaso' como tercer valor de la operación.
--    Es un traspaso de alquiler: se paga mensual y se heredan las condiciones
--    del contrato — por eso en el código comparte los campos de alquiler
--    (garantía, mascotas).
alter type public.operacion_t add value if not exists 'traspaso';

-- 2. Público sugerido de la propiedad. text[] igual que tipos_garantia
--    (una casa puede servir para familia Y para pareja a la vez).
--    El CHECK es un guardrail estructural: la base solo acepta estos dos
--    valores, escriba quien escriba.
alter table public.propiedades
  add column if not exists ideal_para text[]
  check (ideal_para <@ array['familia', 'pareja']);

comment on column public.propiedades.ideal_para is
  'Público sugerido (familia/pareja). Alimenta el filtro "Para familia / Para pareja" de la web. Ver docs/sql/2026-08-17.';

-- 3. La view pública tiene las columnas enumeradas a mano (a propósito: lo que
--    no está acá, no existe para el público), así que la columna nueva hay que
--    sumarla explícitamente. create or replace solo permite AGREGAR columnas
--    AL FINAL — por eso ideal_para queda última aunque en la tabla esté junto
--    a acepta_mascotas.
create or replace view public.propiedades_publicas
  with (security_invoker = off) as
select
  id,
  codigo,
  titulo,
  descripcion,
  operacion,
  tipo,
  estado,
  departamento,
  ciudad,
  barrio,
  case when mostrar_direccion then direccion end as direccion,
  mostrar_direccion,
  case when mostrar_direccion then lat end as lat,
  case when mostrar_direccion then lng end as lng,
  case when precio_publico then precio end as precio,
  moneda,
  precio_publico,
  gastos_comunes,
  dormitorios,
  banos,
  m2_edificados,
  m2_terreno,
  garage,
  plantas,
  hectareas,
  indice_coneat,
  tiene_agua,
  tiene_luz,
  alambrado,
  case when mostrar_direccion then padron end as padron,
  requiere_garantia,
  tipos_garantia,
  acepta_mascotas,
  destacada,
  creado_en,
  actualizado_en,
  ideal_para
from public.propiedades
where estado in ('disponible', 'reservada');

-- Los grants y el comment de la view sobreviven al create or replace:
-- no hay que repetirlos. (El guardrail del precio sigue intacto — verificarlo
-- después con: node scripts/verify-setup.mjs)
