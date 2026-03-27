-- Run this in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.app_settings (
  key text primary key,
  value text not null
);

insert into public.app_settings(key, value)
values ('admin_key', 'CAMBIAR_ESTA_CLAVE')
on conflict (key) do nothing;

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
create policy if not exists schedules_select_public
  on public.schedules
  for select
  to anon
  using (true);

-- Families can register only to existing schedules
create policy if not exists registrations_insert_public
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
create or replace function public.admin_add_schedule(
  p_admin_key text,
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
  v_expected_key text;
  v_row public.schedules;
begin
  select value into v_expected_key
  from public.app_settings
  where key = 'admin_key';

  if v_expected_key is null or p_admin_key is distinct from v_expected_key then
    raise exception 'adminKey inválida';
  end if;

  insert into public.schedules(category, day, time)
  values (coalesce(p_category, ''), coalesce(p_day, ''), coalesce(p_time, ''))
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.admin_add_schedule(text, text, text, text) to anon;
