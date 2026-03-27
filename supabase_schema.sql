-- Run this in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  username text primary key,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.family_users (
  username text primary key,
  pin_hash text not null,
  category text not null,
  created_at timestamptz not null default now()
);

insert into public.admin_users(username, password_hash)
values ('admin', extensions.crypt('Angel2026!', extensions.gen_salt('bf')))
on conflict (username) do update
set password_hash = excluded.password_hash;

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  start_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  parent_email text not null,
  child_name text not null,
  constraint registrations_parent_email_chk check (position('@' in parent_email) > 1)
);

create unique index if not exists registrations_unique_per_child
  on public.registrations (schedule_id, parent_email, child_name);

alter table public.schedules enable row level security;
alter table public.registrations enable row level security;

-- Public read for schedules
drop policy if exists schedules_select_public on public.schedules;
create policy schedules_select_public
  on public.schedules
  for select
  to anon
  using (true);

-- Families can register only to existing schedules
drop policy if exists registrations_insert_public on public.registrations;
create policy registrations_insert_public
  on public.registrations
  for insert
  to anon
  with check (
    exists(select 1 from public.schedules s where s.id = schedule_id)
  );

-- Helper RPC: public counts without exposing personal data
create or replace function public.get_schedule_counts()
returns table(schedule_id uuid, total bigint)
language sql
security definer
set search_path = public
as $$
  select r.schedule_id, count(*)::bigint as total
  from public.registrations r
  group by r.schedule_id;
$$;

grant execute on function public.get_schedule_counts() to anon;

-- Admin RPC controlled by shared key
create or replace function public.verify_admin_login(
  p_username text,
  p_password text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.admin_users u
    where u.username = p_username
      and u.password_hash = extensions.crypt(p_password, u.password_hash)
  );
$$;

grant execute on function public.verify_admin_login(text, text) to anon;

-- Admin RPC controlled by username + password
drop function if exists public.admin_add_schedule(text, text, text, text, text);
drop function if exists public.admin_add_schedule(text, text, text, text);
drop function if exists public.admin_add_schedule(text, text, text, timestamptz);

create or replace function public.admin_add_schedule(
  p_username text,
  p_password text,
  p_category text,
  p_start_at timestamptz
)
returns public.schedules
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.schedules;
begin
  if not public.verify_admin_login(p_username, p_password) then
    raise exception 'Usuario o contraseña inválidos';
  end if;
  if date_part('minute', p_start_at) <> 0 or date_part('second', p_start_at) <> 0 then
    raise exception 'Solo se permiten horarios en punto (minuto 00)';
  end if;

  insert into public.schedules(category, start_at)
  values (coalesce(p_category, ''), p_start_at)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.admin_add_schedule(text, text, text, timestamptz) to anon;

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

drop function if exists public.get_family_schedules(text, text);

create or replace function public.get_family_schedules(
  p_username text,
  p_pin text
)
returns table(id uuid, category text, start_at timestamptz, total bigint, is_registered boolean)
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
    s.start_at,
    coalesce(count(r.id), 0)::bigint as total,
    coalesce(bool_or(
      r.child_name = p_username
      and r.parent_email = (p_username || '@familia.neurofutbol.local')
    ), false) as is_registered
  from public.schedules s
  join fam on fam.category = s.category
  left join public.registrations r on r.schedule_id = s.id
  group by s.id, s.category, s.start_at, s.created_at
  order by s.start_at asc, s.created_at asc;
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

create or replace function public.cancel_family_registration(
  p_username text,
  p_pin text,
  p_schedule_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category text;
  v_deleted bigint;
begin
  select f.category into v_category
  from public.family_users f
  where f.username = p_username
    and f.pin_hash = extensions.crypt(p_pin, f.pin_hash);

  if v_category is null then
    raise exception 'Usuario o código inválidos';
  end if;

  delete from public.registrations r
  where r.schedule_id = p_schedule_id
    and r.child_name = p_username
    and r.parent_email = (p_username || '@familia.neurofutbol.local');

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  return v_deleted;
end;
$$;

grant execute on function public.cancel_family_registration(text, text, uuid) to anon;
