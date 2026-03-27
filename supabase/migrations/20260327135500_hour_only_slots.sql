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
