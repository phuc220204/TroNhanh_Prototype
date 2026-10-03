-- BR-015 regression checks. Run with:
--   supabase db query --linked --file supabase/tests/saas_entitlements.sql
-- All fixture writes are inside this transaction and are rolled back.

begin;

create temp table if not exists saas_entitlement_results (
  test text,
  passed boolean,
  detail text
) on commit drop;

do $$
declare
  v_active_user uuid;
  v_expired_user uuid;
  v_none_user uuid;
  v_active_property uuid;
  v_active_room uuid;
  v_expired_property uuid;
  v_expired_room uuid;
  v_none_property uuid;
  v_none_room uuid;
  v_renter_occupancy uuid;
  v_payload jsonb;
  v_occupancy uuid;
  v_count integer;
  v_message text;
  v_bool boolean;
begin
  select id into v_active_user from auth.users where email = 'seller.a@tronhanh.demo';
  select id into v_expired_user from auth.users where email = 'renter.a@tronhanh.demo';
  select id into v_none_user from auth.users where email = 'seller.b@tronhanh.demo';

  if v_active_user is null or v_expired_user is null or v_none_user is null then
    insert into saas_entitlement_results values
      ('setup demo accounts', false, 'seller.a, seller.b or renter.a is missing');
    return;
  end if;

  -- Build isolated fixtures as the migration/test executor, without a user JWT.
  perform set_config('request.jwt.claims', '', true);
  insert into public.properties (owner_id, name)
  values (v_active_user, 'SaaS entitlement fixture active')
  returning id into v_active_property;
  insert into public.rooms (property_id, owner_id, room_code, area, price, status)
  values (v_active_property, v_active_user, 'ENT-ACTIVE', 20, 3000000, 'Available')
  returning id into v_active_room;

  insert into public.properties (owner_id, name)
  values (v_expired_user, 'SaaS entitlement fixture expired')
  returning id into v_expired_property;
  insert into public.rooms (property_id, owner_id, room_code, area, price, status)
  values (v_expired_property, v_expired_user, 'ENT-EXPIRED', 20, 3000000, 'Available')
  returning id into v_expired_room;

  insert into public.properties (owner_id, name)
  values (v_none_user, 'SaaS entitlement fixture no plan')
  returning id into v_none_property;
  insert into public.rooms (property_id, owner_id, room_code, area, price, status)
  values (v_none_property, v_none_user, 'ENT-NONE', 20, 3000000, 'Available')
  returning id into v_none_room;

  insert into public.occupancies (
    room_id, owner_id, user_id, full_name, start_date, end_date,
    occupant_count, is_active, link_status, is_primary
  ) values (
    v_active_room, v_active_user, v_expired_user, 'SaaS renter confirmation rollback fixture',
    current_date, current_date + 30, 1, true, 'Pending', true
  ) returning id into v_renter_occupancy;

  -- Active seller can read the catalog, use the entitlement helper, and write.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_active_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select public.can_write_saas() into v_bool;
  select count(*) into v_count from public.subscription_plans;
  reset role;
  insert into saas_entitlement_results values
    ('active account can write', v_bool, 'can_write_saas=' || v_bool);
  insert into saas_entitlement_results values
    ('authenticated account can read subscription plans', v_count > 0, 'visible plans=' || v_count);

  begin
    set local role authenticated;
    insert into public.properties (owner_id, name)
    values (v_active_user, 'SaaS entitlement active write test');
    reset role;
    insert into saas_entitlement_results values ('active direct insert is allowed', true, null);
  exception when others then
    reset role;
    insert into saas_entitlement_results values
      ('active direct insert is allowed', false, sqlerrm);
  end;

  -- Exercise the SECURITY DEFINER RPC path and the room-card reverse link.
  begin
    set local role authenticated;
    v_payload := public.create_occupancy_with_contract(
      v_active_room,
      jsonb_build_object(
        'full_name', 'SaaS entitlement rollback fixture',
        'start_date', current_date,
        'end_date', current_date + 30,
        'occupant_count', 1
      ),
      jsonb_build_object(
        'start_date', current_date,
        'end_date', current_date + 30,
        'rent_price', 3000000,
        'deposit', 0
      )
    );
    reset role;
    v_occupancy := (v_payload ->> 'occupancy_id')::uuid;
    select count(*) into v_count
      from public.occupancies o
      join public.contracts c on c.id = o.contract_id
     where o.id = v_occupancy and c.occupancy_id = o.id;
    insert into saas_entitlement_results values
      ('new primary Occupancy links to its contract', v_count = 1, 'matching rows=' || v_count);
  exception when others then
    reset role;
    insert into saas_entitlement_results values
      ('new primary Occupancy links to its contract', false, sqlerrm);
  end;

  -- Expired trial must be denied through both direct table writes and a
  -- SECURITY DEFINER function that bypasses RLS.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_expired_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select public.can_write_saas() into v_bool;
  reset role;
  insert into saas_entitlement_results values
    ('expired account cannot write', not v_bool, 'can_write_saas=' || v_bool);

  begin
    set local role authenticated;
    insert into public.properties (owner_id, name)
    values (v_expired_user, 'SaaS entitlement expired write test');
    reset role;
    insert into saas_entitlement_results values ('expired direct insert is blocked', false, 'INSERT unexpectedly succeeded');
  exception when others then
    reset role;
    v_message := sqlerrm;
    insert into saas_entitlement_results values
      ('expired direct insert is blocked',
       v_message like '%SAAS_SUBSCRIPTION_READ_ONLY%' or v_message like '%SAAS_SUBSCRIPTION_REQUIRED%',
       v_message);
  end;

  begin
    set local role authenticated;
    perform public.update_room(
      v_expired_room, 'ENT-EXPIRED', 20, 3100000, 1, 'Available', null, null, null, null
    );
    reset role;
    insert into saas_entitlement_results values ('expired SECURITY DEFINER write is blocked', false, 'RPC unexpectedly succeeded');
  exception when others then
    reset role;
    v_message := sqlerrm;
    insert into saas_entitlement_results values
      ('expired SECURITY DEFINER write is blocked',
       v_message like '%SAAS_SUBSCRIPTION_READ_ONLY%' or v_message like '%SAAS_SUBSCRIPTION_REQUIRED%',
       v_message);
  end;

  -- An account with no trial/plan must also be blocked by both table RLS and
  -- SECURITY DEFINER RPCs (the latter bypass RLS but still hit the trigger).
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_none_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select public.can_write_saas() into v_bool;
  reset role;
  insert into saas_entitlement_results values
    ('account without a subscription cannot write', not v_bool, 'can_write_saas=' || v_bool);

  begin
    set local role authenticated;
    insert into public.properties (owner_id, name)
    values (v_none_user, 'SaaS entitlement no plan write test');
    reset role;
    insert into saas_entitlement_results values
      ('no-subscription direct insert is blocked', false, 'INSERT unexpectedly succeeded');
  exception when others then
    reset role;
    v_message := sqlerrm;
    insert into saas_entitlement_results values
      ('no-subscription direct insert is blocked',
       v_message like '%SAAS_SUBSCRIPTION_REQUIRED%', v_message);
  end;

  begin
    set local role authenticated;
    perform public.update_room(
      v_none_room, 'ENT-NONE', 20, 3100000, 1, 'Available', null, null, null, null
    );
    reset role;
    insert into saas_entitlement_results values
      ('no-subscription SECURITY DEFINER write is blocked', false, 'RPC unexpectedly succeeded');
  exception when others then
    reset role;
    v_message := sqlerrm;
    insert into saas_entitlement_results values
      ('no-subscription SECURITY DEFINER write is blocked',
       v_message like '%SAAS_SUBSCRIPTION_REQUIRED%', v_message);
  end;

  -- A renter's own confirmation is not a landlord SaaS write, even if the
  -- renter account itself has an expired trial.
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_expired_user, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.confirm_occupancy_link(v_renter_occupancy, true);
    reset role;
    select link_status into v_message
      from public.occupancies where id = v_renter_occupancy;
    insert into saas_entitlement_results values
      ('expired renter can confirm own occupancy', v_message = 'Confirmed', v_message);
  exception when others then
    reset role;
    insert into saas_entitlement_results values
      ('expired renter can confirm own occupancy', false, sqlerrm);
  end;
end;
$$;

select case when passed then 'PASS' else 'FAIL' end as result, test, detail
  from saas_entitlement_results
 order by passed, test;

rollback;
