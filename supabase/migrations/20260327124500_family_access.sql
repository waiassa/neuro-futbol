create extension if not exists pgcrypto;

create table if not exists public.family_users (
  username text primary key,
  pin_hash text not null,
  category text not null,
  created_at timestamptz not null default now()
);

create or replace function public.family_login(
  p_username text,
  p_pin text
)
returns table(username text, category text)
language sql
security definer
set search_path = public
as $$
  select f.username, f.category
  from public.family_users f
  where f.username = p_username
    and f.pin_hash = extensions.crypt(p_pin, f.pin_hash);
$$;

grant execute on function public.family_login(text, text) to anon;

create or replace function public.admin_create_family_user(
  p_admin_username text,
  p_admin_password text,
  p_family_username text,
  p_family_pin text,
  p_family_category text
)
returns public.family_users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.family_users;
begin
  if not public.verify_admin_login(p_admin_username, p_admin_password) then
    raise exception 'Usuario o contraseña inválidos';
  end if;
  if p_family_pin !~ '^[0-9]{4}$' then
    raise exception 'El código debe tener 4 números';
  end if;

  insert into public.family_users(username, pin_hash, category)
  values (
    lower(trim(p_family_username)),
    extensions.crypt(p_family_pin, extensions.gen_salt('bf')),
    trim(p_family_category)
  )
  on conflict (username) do update
  set pin_hash = excluded.pin_hash,
      category = excluded.category
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.admin_create_family_user(text, text, text, text, text) to anon;

create or replace function public.get_family_schedules(
  p_username text,
  p_pin text
)
returns table(id uuid, category text, day text, "time" text, total bigint)
language sql
security definer
set search_path = public
as $$
  with fam as (
    select f.category
    from public.family_users f
    where f.username = p_username
      and f.pin_hash = extensions.crypt(p_pin, f.pin_hash)
  )
  select
    s.id,
    s.category,
    s.day,
    s.time,
    coalesce(count(r.id), 0)::bigint as total
  from public.schedules s
  join fam on fam.category = s.category
  left join public.registrations r on r.schedule_id = s.id
  group by s.id, s.category, s.day, s.time, s.created_at
  order by s.created_at asc;
$$;

grant execute on function public.get_family_schedules(text, text) to anon;

drop policy if exists registrations_insert_public on public.registrations;

create or replace function public.register_family(
  p_username text,
  p_pin text,
  p_schedule_id uuid,
  p_parent_email text,
  p_child_name text
)
returns public.registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category text;
  v_schedule_category text;
  v_row public.registrations;
begin
  select f.category into v_category
  from public.family_users f
  where f.username = p_username
    and f.pin_hash = extensions.crypt(p_pin, f.pin_hash);

  if v_category is null then
    raise exception 'Usuario o código inválidos';
  end if;

  select s.category into v_schedule_category
  from public.schedules s
  where s.id = p_schedule_id;

  if v_schedule_category is null then
    raise exception 'Turno inválido';
  end if;

  if v_schedule_category is distinct from v_category then
    raise exception 'Ese turno no corresponde a tu categoría';
  end if;

  insert into public.registrations(schedule_id, parent_email, child_name)
  values (p_schedule_id, p_parent_email, p_child_name)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.register_family(text, text, uuid, text, text) to anon;
