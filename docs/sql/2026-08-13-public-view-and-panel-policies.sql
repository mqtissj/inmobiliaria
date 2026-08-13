-- =============================================================================
-- View pública + políticas del panel + políticas de Storage
-- Fecha: 13/8/2026 · Se corre en Supabase → SQL Editor → Run
-- Es seguro correrlo más de una vez (create or replace / drop if exists).
--
-- POR QUÉ EXISTE ESTO (para la defensa):
-- RLS filtra FILAS, no columnas. La política de anon dejaba leer la tabla
-- propiedades entera — incluida la columna precio de propiedades con
-- precio_publico = false. El HTML no lo mostraba, pero cualquiera con la
-- consola del navegador y la anon key podía pedirlo directo a la API.
-- El arreglo es estructural, no cosmético: el público solo puede leer una
-- VIEW donde el dato sensible ya viene anulado desde la base. Mismo espíritu
-- que el guardrail del bot (CLAUDE.md §4.2): si el dato no sale de la base,
-- ninguna capa de arriba lo puede filtrar.
-- =============================================================================

-- 1. La view que ve el público.
--    security_invoker = off (explícito): la view corre con permisos de su
--    dueño (postgres), que ve todas las filas; el WHERE y los CASE deciden
--    qué llega afuera. Es el único lugar del sistema con ese privilegio.
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
  -- dirección exacta, coordenadas y padrón solo si la propiedad lo permite:
  -- con el padrón se ubica el inmueble exacto en el catastro, así que
  -- ocultarlo va junto con ocultar la dirección
  case when mostrar_direccion then direccion end as direccion,
  mostrar_direccion,
  case when mostrar_direccion then lat end as lat,
  case when mostrar_direccion then lng end as lng,
  -- el guardrail del precio: si no es público, a la API llega null
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
  actualizado_en
from public.propiedades
where estado in ('disponible', 'reservada');

comment on view public.propiedades_publicas is
  'Lo único de propiedades que puede leer el público. Precio/dirección/padrón anulados según flags. Ver docs/sql/2026-08-13.';

-- 2. Permisos: el público (anon) pierde la tabla y gana la view.
revoke select on public.propiedades from anon;
grant select on public.propiedades_publicas to anon;
grant select on public.propiedades_publicas to authenticated;

-- 3. El panel (usuarios logueados) opera la tabla completa vía RLS.
drop policy if exists "panel lee todo" on public.propiedades;
create policy "panel lee todo"
  on public.propiedades for select
  to authenticated using (true);

drop policy if exists "panel inserta" on public.propiedades;
create policy "panel inserta"
  on public.propiedades for insert
  to authenticated with check (true);

drop policy if exists "panel actualiza" on public.propiedades;
create policy "panel actualiza"
  on public.propiedades for update
  to authenticated using (true) with check (true);

drop policy if exists "panel borra" on public.propiedades;
create policy "panel borra"
  on public.propiedades for delete
  to authenticated using (true);

-- 4. Fotos: el público las sigue leyendo (no hay dato sensible en una URL de
--    foto); el panel las crea y borra.
drop policy if exists "panel inserta fotos" on public.propiedad_fotos;
create policy "panel inserta fotos"
  on public.propiedad_fotos for insert
  to authenticated with check (true);

drop policy if exists "panel actualiza fotos" on public.propiedad_fotos;
create policy "panel actualiza fotos"
  on public.propiedad_fotos for update
  to authenticated using (true) with check (true);

drop policy if exists "panel borra fotos" on public.propiedad_fotos;
create policy "panel borra fotos"
  on public.propiedad_fotos for delete
  to authenticated using (true);

-- 5. Storage: subir, VER y borrar archivos del bucket de fotos, solo logueados.
--    (La lectura por URL pública funciona igual porque el bucket es public = true.)
--
--    LECCIÓN APRENDIDA (13/8, encontrada por la batería E2E): para borrar un
--    objeto de Storage no alcanza la política de DELETE — el rol también
--    necesita SELECT sobre storage.objects para "ver" lo que quiere borrar.
--    Sin ella, remove() devuelve 0 borrados SIN ERROR y los archivos quedan
--    huérfanos en el bucket.
drop policy if exists "panel sube fotos" on storage.objects;
create policy "panel sube fotos"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'fotos-propiedades');

drop policy if exists "panel ve archivos de fotos" on storage.objects;
create policy "panel ve archivos de fotos"
  on storage.objects for select
  to authenticated using (bucket_id = 'fotos-propiedades');

drop policy if exists "panel borra archivos de fotos" on storage.objects;
create policy "panel borra archivos de fotos"
  on storage.objects for delete
  to authenticated using (bucket_id = 'fotos-propiedades');

-- Nota: config_negocio y faqs quedan como están (el panel todavía no las
-- edita — cuando lleguemos a esa pantalla se agregan sus políticas).
