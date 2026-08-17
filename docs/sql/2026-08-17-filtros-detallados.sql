-- =============================================================================
-- Filtros detallados (exterior, cochera, comodidades, baño) + depósito
-- Fecha: 17/8/2026 · Se corre en Supabase → SQL Editor → Run
-- Es seguro correrlo más de una vez (if not exists / create or replace).
--
-- POR QUÉ EXISTE ESTO:
-- Pedido del cliente: poder filtrar por patio (abierto o cerrado), fondo,
-- parrillero, barbacoa, cochera, comodidades (aire, calefacción, estufa a leña,
-- calefón, placares), cantidad de baños y si acepta mascotas.
-- Y una corrección: PF SÍ trabaja con depósito, al revés de lo que se había
-- dicho el 17/8 a la mañana y quedó publicado.
--
-- OJO — HASTA QUE ESTO NO CORRA, EL PANEL NO GUARDA PROPIEDADES:
-- el alta y la edición mandan `patio` y `caracteristicas`, y si las columnas
-- no existen el insert falla entero. Es el mismo caso del SQL del traspaso.
-- =============================================================================

-- 1. El patio va en su propia columna porque NO es un sí/no: son tres estados
--    (no tiene / abierto / cerrado) y el cliente quiere filtrar por el tipo.
--    El CHECK es un guardrail estructural igual que el de ideal_para: la base
--    solo acepta estos dos valores, escriba quien escriba.
alter table public.propiedades
  add column if not exists patio text
  check (patio in ('abierto', 'cerrado'));

comment on column public.propiedades.patio is
  'Tipo de patio: abierto o cerrado. NULL = no tiene. Alimenta el filtro de exterior de la web.';

-- 2. El resto son banderas, y van TODAS en un mismo array en vez de once
--    columnas booleanas. Motivos:
--      - Es el mismo patrón que ya usan tipos_garantia e ideal_para.
--      - Sumar "piscina" el día de mañana es editar este CHECK, no un ALTER
--        TABLE por cada comodidad nueva.
--      - Once columnas booleanas casi siempre en null ensucian la tabla.
--    El CHECK con <@ ("contenido en") deja la base como única fuente de verdad
--    del vocabulario: un valor inventado no entra ni por la API ni por el panel.
alter table public.propiedades
  add column if not exists caracteristicas text[]
  check (caracteristicas <@ array[
    -- exterior
    'fondo', 'parrillero', 'barbacoa',
    -- cochera (garage ya existe como columna propia, ver nota abajo)
    'cochera',
    -- comodidades
    'aire_acondicionado', 'calefaccion', 'estufa_lena', 'calefon', 'placares',
    -- baño
    'bano_completo'
  ]);

comment on column public.propiedades.caracteristicas is
  'Banderas de exterior, cochera, comodidades y baño completo. Vocabulario cerrado por CHECK. Ver docs/sql/2026-08-17-filtros-detallados.sql';

-- NOTA sobre garaje vs cochera (para la defensa):
-- `garage` ya existía como columna booleana desde F0, está en la view, en el
-- panel y en la ficha. Migrarla al array obligaría a tocar filas existentes y
-- tres pantallas para que el usuario vea exactamente lo mismo. Por eso queda
-- donde está y solo se suma 'cochera' al array. En la web las dos aparecen
-- juntas bajo "Cochera"; por dentro son dos consultas distintas, y está
-- comentado en src/lib/queries.ts.

-- Índice GIN: es el que hace barata la consulta "contiene parrillero".
-- Sin él, filtrar por característica sería un recorrido de toda la tabla.
create index if not exists propiedades_caracteristicas_gin
  on public.propiedades using gin (caracteristicas);

-- 3. La view pública enumera columnas a mano a propósito (lo que no está acá,
--    no existe para el público), así que las nuevas hay que sumarlas.
--    create or replace solo permite AGREGAR columnas AL FINAL — por eso patio
--    y caracteristicas quedan últimas aunque en la tabla estén en otro lugar.
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
  ideal_para,
  patio,
  caracteristicas
from public.propiedades
where estado in ('disponible', 'reservada');

-- 4. CORRECCIÓN: PF sí trabaja con depósito.
--    La FAQ publicada decía exactamente lo contrario ("No trabajamos con
--    depósito"), y como las FAQs son DATOS, eso ya estaba visible en producción.
--    YA SE APLICÓ el 17/8/2026 por script con service_role; esto queda acá para
--    que el archivo sea la historia completa del cambio y para poder repetirlo
--    en otro entorno. Correrlo de nuevo no hace daño: deja el mismo texto.
update public.faqs
   set respuesta = 'Trabajamos con depósito. También aceptamos seguros de alquiler de MAPFRE, Porto Seguro, Sancor y SURA, y según el propietario ANDA, Contaduría (CGN) o garantía propietaria. En cada propiedad publicada figura qué garantías acepta.'
 where pregunta ilike '%garant%';

-- =============================================================================
-- 5. COMISIÓN — NO CORRAS ESTO SIN LEERLO PRIMERO.
--
-- El cliente dijo "cobran 60% de comisión", pero 60% de un mes de alquiler y
-- 60% del precio de venta son cosas completamente distintas, y esto se publica
-- en el sitio de una inmobiliaria real. Descomentá UNA de las dos versiones,
-- la que corresponda, y borrá la otra. Si no estás seguro, no corras ninguna:
-- la FAQ que está hoy ("se informa en cada operación") no dice nada falso.
-- =============================================================================

-- VERSIÓN A — el 60% es sobre UN MES DE ALQUILER (lo habitual en alquileres):
-- update public.faqs
--    set respuesta = 'En alquileres la comisión es del 60% de un mes de alquiler. En ventas se informa según la operación; un asesor te da el detalle exacto.'
--  where pregunta ilike '%comisi%';

-- VERSIÓN B — el 60% es sobre otra base (completá cuál antes de correr):
-- update public.faqs
--    set respuesta = 'La comisión es del 60% de ______. Un asesor te da el detalle exacto de cada operación.'
--  where pregunta ilike '%comisi%';

-- Verificación después de correr esto:
--   node scripts/verify-setup.mjs
