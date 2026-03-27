drop function if exists public.get_family_schedules(text, text);

create or replace function public.get_family_schedules(
  p_username text,
  p_pin text
)
returns table(id uuid, category text, day text, "time" text, total bigint, is_registered boolean)
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
    coalesce(count(r.id), 0)::bigint as total,
    bool_or(
      r.child_name = p_username
      and r.parent_email = (p_username || '@familia.neurofutbol.local')
    ) as is_registered
  from public.schedules s
  join fam on fam.category = s.category
  left join public.registrations r on r.schedule_id = s.id
  group by s.id, s.category, s.day, s.time, s.created_at
  order by s.created_at asc;
$$;

grant execute on function public.get_family_schedules(text, text) to anon;

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
