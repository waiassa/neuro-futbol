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
  ),
  slot_counts as (
    select
      s2.start_at,
      count(r2.id)::bigint as total
    from public.schedules s2
    left join public.registrations r2 on r2.schedule_id = s2.id
    group by s2.start_at
  )
  select
    s.id,
    s.category,
    s.start_at,
    coalesce(sc.total, 0)::bigint as total,
    exists(
      select 1
      from public.registrations r
      where r.schedule_id = s.id
        and r.child_name = p_username
        and r.parent_email = (p_username || '@familia.neurofutbol.local')
    ) as is_registered
  from public.schedules s
  join fam on fam.category = s.category
  left join slot_counts sc on sc.start_at = s.start_at
  order by s.start_at asc, s.created_at asc;
$$;

grant execute on function public.get_family_schedules(text, text) to anon;
