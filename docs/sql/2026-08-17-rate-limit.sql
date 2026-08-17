-- =============================================================================
-- Límite de intentos (rate limiting) para el login y la recuperación
-- Fecha: 17/8/2026 · Se corre en Supabase → SQL Editor → Run
-- Es seguro correrlo más de una vez (if not exists / create or replace).
--
-- POR QUÉ EXISTE ESTO (para la defensa):
-- El login es un endpoint POST público: cualquiera puede pegarle probando
-- contraseñas hasta acertar, sin límite. Supabase tiene protecciones propias
-- pero no son configurables desde acá ni suficientes por sí solas.
--
-- POR QUÉ EN POSTGRES Y NO EN MEMORIA:
-- La opción fácil es un Map en el proceso de Node. No sirve en Vercel: cada
-- instancia serverless tiene su propio Map y se borra en cada arranque en frío,
-- así que el atacante solo tiene que esperar o caer en otra instancia. Una tabla
-- es la única forma de que el contador sea uno solo para todo el sistema.
-- Redis sería lo típico, pero está descartado por CLAUDE.md §3 (sobreingeniería
-- para este volumen) y Postgres ya está pago y andando.
--
-- La misma tabla y la misma función se van a reusar para /api/chat en F7,
-- que es donde el límite protege plata de verdad (el saldo de la API).
-- =============================================================================

-- 1. La tabla. Una fila por intento. `clave` va con prefijo de espacio de
--    nombres ('login:ip:1.2.3.4', 'chat:conv:abc') para que un mismo mecanismo
--    sirva a varias pantallas sin mezclar contadores.
create table if not exists public.intentos (
  id bigint generated always as identity primary key,
  clave text not null,
  ocurrio_en timestamptz not null default now()
);

comment on table public.intentos is
  'Contador de intentos para rate limiting (login, recuperación y más adelante el bot). Ver docs/sql/2026-08-17-rate-limit.sql';

-- El índice es lo que hace barata la consulta: siempre se pregunta por una
-- clave y una ventana de tiempo reciente.
create index if not exists intentos_clave_fecha
  on public.intentos (clave, ocurrio_en desc);

-- 2. RLS prendido y SIN NINGUNA POLÍTICA, igual que `leads` (CLAUDE.md §4.3):
--    ni anon ni authenticated pueden leerla ni escribirla desde la API.
--    Si el público pudiera escribir acá, un atacante llenaría el contador de
--    la IP del dueño de la inmobiliaria y lo dejaría afuera de su propio panel.
alter table public.intentos enable row level security;

revoke all on public.intentos from anon, authenticated;

-- 3. La función que cuenta y registra, en UNA sola ida a la base.
--    Va todo junto a propósito: si primero contáramos y después insertáramos
--    desde el servidor, dos intentos simultáneos podrían pasar los dos.
--
--    Devuelve `permitido` y, cuando no, cuántos segundos falta esperar, para
--    poder decírselo al usuario en vez de un "error" pelado (REGLAS-CLAUDE.md:
--    qué pasó / qué hacer / cuándo reintentar).
create or replace function public.registrar_intento(
  p_claves text[],
  p_limite int,
  p_ventana_minutos int
)
returns table (permitido boolean, espera_segundos int)
language plpgsql
security definer
-- search_path fijo: sin esto, un search_path manipulado podría hacer que la
-- función ejecute tablas de otro esquema con permisos de su dueño.
set search_path = public, pg_temp
as $$
declare
  v_desde timestamptz := now() - make_interval(mins => p_ventana_minutos);
  v_cuenta int;
  v_mas_viejo timestamptz;
  v_espera int;
begin
  -- Limpieza oportunista: la tabla nunca crece sin control y no hace falta cron.
  delete from public.intentos where ocurrio_en < now() - interval '1 day';

  -- La clave MÁS golpeada manda: si cualquiera de las claves pasó el límite,
  -- se frena (una es la IP, otra el mail — alcanza con que una esté abusada).
  select count(*), min(ocurrio_en)
    into v_cuenta, v_mas_viejo
    from public.intentos
   where clave = any(p_claves)
     and ocurrio_en >= v_desde
   group by clave
   order by count(*) desc
   limit 1;

  if v_cuenta is not null and v_cuenta >= p_limite then
    -- Se libera cuando el intento más viejo de la ventana termina de expirar.
    v_espera := greatest(
      1,
      ceil(extract(epoch from (v_mas_viejo + make_interval(mins => p_ventana_minutos)) - now()))::int
    );
    return query select false, v_espera;
    return;
  end if;

  insert into public.intentos (clave)
  select unnest(p_claves);

  return query select true, 0;
end;
$$;

comment on function public.registrar_intento(text[], int, int) is
  'Registra un intento y dice si se pasó del límite. La llama SOLO el servidor con service_role.';

-- 4. Borra el contador cuando el intento SALIÓ BIEN: quien acierta la
--    contraseña no tiene que quedar penalizado por los tipeos anteriores.
create or replace function public.limpiar_intentos(p_claves text[])
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.intentos where clave = any(p_claves);
$$;

comment on function public.limpiar_intentos(text[]) is
  'Limpia los intentos de estas claves tras un login exitoso. La llama SOLO el servidor con service_role.';

-- 5. Nadie las ejecuta desde el navegador. Solo el servidor, con service_role
--    (que saltea RLS por diseño y vive únicamente en variables de entorno del
--    servidor — CLAUDE.md §4.4).
--    Si esto quedara abierto a `anon`, cualquiera podría inflar el contador de
--    la IP del cliente y dejarlo sin panel.
revoke all on function public.registrar_intento(text[], int, int) from public, anon, authenticated;
revoke all on function public.limpiar_intentos(text[]) from public, anon, authenticated;

-- Verificación después de correr esto:
--   node scripts/verify-setup.mjs
