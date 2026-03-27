-- Run this in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  username text primary key,
  password_hash text not null,
  created_at timestamptz not null default now()
);

insert into public.admin_users(username, password_hash)
values ('admin', extensions.crypt('Angel2026!', extensions.gen_salt('bf')))
on conflict (username) do update
set password_hash = excluded.password_hash;

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  day text not null,
  time text not null,
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
create or replace function public.admin_add_schedule(
  p_username text,
  p_password text,
  p_category text,
  p_day text,
  p_time text
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

  insert into public.schedules(category, day, time)
  values (coalesce(p_category, ''), coalesce(p_day, ''), coalesce(p_time, ''))
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.admin_add_schedule(text, text, text, text, text) to anon;
