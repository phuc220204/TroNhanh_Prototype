-- `uq_reading_room_type_period` is a partial unique index: only active
-- readings (`deleted_at is null`) are unique. The later per-room pricing
-- migration accidentally omitted that predicate from its UPSERT target,
-- causing record_utility_reading to fail at runtime with SQLSTATE 42P10.

create or replace function public.record_utility_reading(
  p_room_id uuid,
  p_type text,
  p_period text,
  p_current numeric
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid;
  v_owner uuid;
  v_property uuid;
  v_previous numeric;
  v_unit_price numeric;
  v_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  if p_type not in ('Electricity', 'Water') then
    raise exception 'INVALID_READING_TYPE';
  end if;

  select owner_id, property_id into v_owner, v_property
    from public.rooms where id = p_room_id and deleted_at is null;
  if v_owner is null or v_owner <> v_uid then
    raise exception 'ROOM_NOT_OWNED';
  end if;

  select current_reading into v_previous
    from public.utility_readings
   where room_id = p_room_id and type = p_type and deleted_at is null
   order by period desc
   limit 1;
  v_previous := coalesce(v_previous, 0);
  if p_current < v_previous then
    raise exception 'READING_LOWER_THAN_PREVIOUS';
  end if;

  select coalesce(
           case when p_type = 'Electricity' then r.electricity_price else r.water_price end,
           case when p_type = 'Electricity' then p.electricity_unit_price else p.water_unit_price end
         )
    into v_unit_price
    from public.rooms r
    join public.properties p on p.id = r.property_id
   where r.id = p_room_id;

  insert into public.utility_readings
    (room_id, owner_id, type, period, previous_reading, current_reading, unit_price)
  values (p_room_id, v_uid, p_type, p_period, v_previous, p_current, coalesce(v_unit_price, 0))
  on conflict (room_id, type, period) where deleted_at is null
  do update set
    previous_reading = excluded.previous_reading,
    current_reading = excluded.current_reading,
    unit_price = excluded.unit_price,
    updated_at = now()
  returning id into v_id;

  return v_id;
end $$;

revoke execute on function public.record_utility_reading(uuid, text, text, numeric) from public, anon;
grant execute on function public.record_utility_reading(uuid, text, text, numeric) to authenticated;
