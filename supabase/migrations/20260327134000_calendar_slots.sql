truncate table public.schedules restart identity cascade;

alter table public.schedules
  add column if not exists start_at timestamptz;

alter table public.schedules
  alter column start_at set not null;

alter table public.schedules
  drop column if exists day,
  drop column if exists time;

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

  insert into public.schedules(category, start_at)
  values (coalesce(p_category, ''), p_start_at)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.admin_add_schedule(text, text, text, timestamptz) to anon;

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
