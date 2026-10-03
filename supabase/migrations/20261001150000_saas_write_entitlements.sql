-- BR-015: enforce SaaS write entitlement in Postgres, not only in the UI.
-- Also keep the primary Occupancy linked through occupancies.contract_id.

create or replace function public.can_write_saas()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.user_subscriptions s
       where s.seller_id = auth.uid()
         and s.status in ('TRIAL', 'ACTIVE')
         and s.expire_date >= current_date
     );
$$;

revoke all on function public.can_write_saas() from public, anon;
grant execute on function public.can_write_saas() to authenticated;

-- Existing contracts are the source of truth for the primary Occupancy.
-- Backfill rows created after the original multi-occupancy migration.
update public.occupancies o
   set contract_id = c.id,
       is_primary = true
  from public.contracts c
 where c.occupancy_id = o.id
   and o.contract_id is null;

-- Future contracts must populate the reverse link used by room-card queries.
create or replace function public.link_primary_occupancy_to_contract()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.occupancies o
     set contract_id = new.id,
         is_primary = true
   where o.id = new.occupancy_id
     and o.room_id = new.room_id
     and o.owner_id = new.owner_id;

  if not found then
    raise exception 'CONTRACT_OCCUPANCY_MISMATCH';
  end if;

  return new;
end;
$$;

revoke all on function public.link_primary_occupancy_to_contract() from public, anon, authenticated;
drop trigger if exists link_primary_occupancy_to_contract on public.contracts;
create trigger link_primary_occupancy_to_contract
after insert on public.contracts
for each row execute function public.link_primary_occupancy_to_contract();

-- This row trigger is defense in depth for SECURITY DEFINER RPCs, which bypass
-- RLS. Renter-side updates to an Occupancy are not landlord SaaS writes, so
-- they are left to their existing renter-scoped policy.
create or replace function public.guard_saas_workspace_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner_id uuid;
begin
  -- Trusted SQL migrations/service-role jobs without an end-user JWT are not
  -- evaluated as a landlord. Authenticated client requests always have a UID.
  if v_uid is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_table_name = 'invoice_items' then
    if tg_op = 'INSERT' then
      select i.owner_id into v_owner_id
        from public.invoices i
       where i.id = new.invoice_id;
    elsif tg_op = 'DELETE' then
      select i.owner_id into v_owner_id
        from public.invoices i
       where i.id = old.invoice_id;
    else
      select i.owner_id into v_owner_id
        from public.invoices i
       where i.id in (old.invoice_id, new.invoice_id)
         and i.owner_id = v_uid
       limit 1;
    end if;
  elsif tg_op = 'INSERT' then
    v_owner_id := new.owner_id;
  elsif tg_op = 'DELETE' then
    v_owner_id := old.owner_id;
  elsif old.owner_id = v_uid or new.owner_id = v_uid then
    v_owner_id := v_uid;
  end if;

  if v_owner_id = v_uid and not public.can_write_saas() then
    if exists (
      select 1
        from public.user_subscriptions s
       where s.seller_id = v_uid
         and (s.status = 'READ_ONLY'
           or (s.status in ('TRIAL', 'ACTIVE') and s.expire_date < current_date))
    ) then
      raise exception 'SAAS_SUBSCRIPTION_READ_ONLY' using errcode = 'P0001';
    end if;
    raise exception 'SAAS_SUBSCRIPTION_REQUIRED' using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.guard_saas_workspace_write() from public, anon, authenticated;

drop trigger if exists guard_saas_write_properties on public.properties;
create trigger guard_saas_write_properties
before insert or update or delete on public.properties
for each row execute function public.guard_saas_workspace_write();

drop trigger if exists guard_saas_write_rooms on public.rooms;
create trigger guard_saas_write_rooms
before insert or update or delete on public.rooms
for each row execute function public.guard_saas_workspace_write();

drop trigger if exists guard_saas_write_occupancies on public.occupancies;
create trigger guard_saas_write_occupancies
before insert or update or delete on public.occupancies
for each row execute function public.guard_saas_workspace_write();

drop trigger if exists guard_saas_write_contracts on public.contracts;
create trigger guard_saas_write_contracts
before insert or update or delete on public.contracts
for each row execute function public.guard_saas_workspace_write();

drop trigger if exists guard_saas_write_utility_readings on public.utility_readings;
create trigger guard_saas_write_utility_readings
before insert or update or delete on public.utility_readings
for each row execute function public.guard_saas_workspace_write();

drop trigger if exists guard_saas_write_invoices on public.invoices;
create trigger guard_saas_write_invoices
before insert or update or delete on public.invoices
for each row execute function public.guard_saas_workspace_write();

drop trigger if exists guard_saas_write_invoice_items on public.invoice_items;
create trigger guard_saas_write_invoice_items
before insert or update or delete on public.invoice_items
for each row execute function public.guard_saas_workspace_write();

drop trigger if exists guard_saas_write_payments on public.payments;
create trigger guard_saas_write_payments
before insert or update or delete on public.payments
for each row execute function public.guard_saas_workspace_write();

-- Keep owner reads available after expiry while requiring a valid trial/plan for
-- every owner write. Renter-scoped read/confirm policies remain independent.
drop policy if exists "Owner properties access" on public.properties;
drop policy if exists "Owner reads properties" on public.properties;
drop policy if exists "Owner inserts properties" on public.properties;
drop policy if exists "Owner updates properties" on public.properties;
drop policy if exists "Owner deletes properties" on public.properties;
create policy "Owner reads properties" on public.properties
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner inserts properties" on public.properties
  for insert to authenticated with check (auth.uid() = owner_id and public.can_write_saas());
create policy "Owner updates properties" on public.properties
  for update to authenticated using (auth.uid() = owner_id and public.can_write_saas())
  with check (auth.uid() = owner_id and public.can_write_saas());
create policy "Owner deletes properties" on public.properties
  for delete to authenticated using (auth.uid() = owner_id and public.can_write_saas());

drop policy if exists "Owner rooms access" on public.rooms;
drop policy if exists "Owner reads rooms" on public.rooms;
drop policy if exists "Owner inserts rooms" on public.rooms;
drop policy if exists "Owner updates rooms" on public.rooms;
drop policy if exists "Owner deletes rooms" on public.rooms;
create policy "Owner reads rooms" on public.rooms
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner inserts rooms" on public.rooms
  for insert to authenticated with check (auth.uid() = owner_id and public.can_write_saas());
create policy "Owner updates rooms" on public.rooms
  for update to authenticated using (auth.uid() = owner_id and public.can_write_saas())
  with check (auth.uid() = owner_id and public.can_write_saas());
create policy "Owner deletes rooms" on public.rooms
  for delete to authenticated using (auth.uid() = owner_id and public.can_write_saas());

drop policy if exists "Owner occupancies access" on public.occupancies;
drop policy if exists "Owner reads occupancies" on public.occupancies;
drop policy if exists "Owner inserts occupancies" on public.occupancies;
drop policy if exists "Owner updates occupancies" on public.occupancies;
drop policy if exists "Owner deletes occupancies" on public.occupancies;
create policy "Owner reads occupancies" on public.occupancies
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner inserts occupancies" on public.occupancies
  for insert to authenticated with check (auth.uid() = owner_id and public.can_write_saas());
create policy "Owner updates occupancies" on public.occupancies
  for update to authenticated using (auth.uid() = owner_id and public.can_write_saas())
  with check (auth.uid() = owner_id and public.can_write_saas());
create policy "Owner deletes occupancies" on public.occupancies
  for delete to authenticated using (auth.uid() = owner_id and public.can_write_saas());

drop policy if exists "Owner contracts access" on public.contracts;
drop policy if exists "Owner reads contracts" on public.contracts;
drop policy if exists "Owner inserts contracts" on public.contracts;
drop policy if exists "Owner updates contracts" on public.contracts;
drop policy if exists "Owner deletes contracts" on public.contracts;
create policy "Owner reads contracts" on public.contracts
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner inserts contracts" on public.contracts
  for insert to authenticated with check (auth.uid() = owner_id and public.can_write_saas());
create policy "Owner updates contracts" on public.contracts
  for update to authenticated using (auth.uid() = owner_id and public.can_write_saas())
  with check (auth.uid() = owner_id and public.can_write_saas());
create policy "Owner deletes contracts" on public.contracts
  for delete to authenticated using (auth.uid() = owner_id and public.can_write_saas());

drop policy if exists "Owner utility readings access" on public.utility_readings;
drop policy if exists "Owner reads utility readings" on public.utility_readings;
drop policy if exists "Owner inserts utility readings" on public.utility_readings;
drop policy if exists "Owner updates utility readings" on public.utility_readings;
drop policy if exists "Owner deletes utility readings" on public.utility_readings;
create policy "Owner reads utility readings" on public.utility_readings
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner inserts utility readings" on public.utility_readings
  for insert to authenticated with check (auth.uid() = owner_id and public.can_write_saas());
create policy "Owner updates utility readings" on public.utility_readings
  for update to authenticated using (auth.uid() = owner_id and public.can_write_saas())
  with check (auth.uid() = owner_id and public.can_write_saas());
create policy "Owner deletes utility readings" on public.utility_readings
  for delete to authenticated using (auth.uid() = owner_id and public.can_write_saas());

drop policy if exists "Owner invoices access" on public.invoices;
drop policy if exists "Owner reads invoices" on public.invoices;
drop policy if exists "Owner inserts invoices" on public.invoices;
drop policy if exists "Owner updates invoices" on public.invoices;
drop policy if exists "Owner deletes invoices" on public.invoices;
create policy "Owner reads invoices" on public.invoices
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner inserts invoices" on public.invoices
  for insert to authenticated with check (auth.uid() = owner_id and public.can_write_saas());
create policy "Owner updates invoices" on public.invoices
  for update to authenticated using (auth.uid() = owner_id and public.can_write_saas())
  with check (auth.uid() = owner_id and public.can_write_saas());
create policy "Owner deletes invoices" on public.invoices
  for delete to authenticated using (auth.uid() = owner_id and public.can_write_saas());

drop policy if exists "Owner invoice items access" on public.invoice_items;
drop policy if exists "Owner reads invoice items" on public.invoice_items;
drop policy if exists "Owner inserts invoice items" on public.invoice_items;
drop policy if exists "Owner updates invoice items" on public.invoice_items;
drop policy if exists "Owner deletes invoice items" on public.invoice_items;
create policy "Owner reads invoice items" on public.invoice_items
  for select to authenticated using (
    exists (select 1 from public.invoices i
             where i.id = invoice_items.invoice_id and i.owner_id = auth.uid())
  );
create policy "Owner inserts invoice items" on public.invoice_items
  for insert to authenticated with check (
    public.can_write_saas()
    and exists (select 1 from public.invoices i
                 where i.id = invoice_items.invoice_id and i.owner_id = auth.uid())
  );
create policy "Owner updates invoice items" on public.invoice_items
  for update to authenticated using (
    public.can_write_saas()
    and exists (select 1 from public.invoices i
                 where i.id = invoice_items.invoice_id and i.owner_id = auth.uid())
  ) with check (
    public.can_write_saas()
    and exists (select 1 from public.invoices i
                 where i.id = invoice_items.invoice_id and i.owner_id = auth.uid())
  );
create policy "Owner deletes invoice items" on public.invoice_items
  for delete to authenticated using (
    public.can_write_saas()
    and exists (select 1 from public.invoices i
                 where i.id = invoice_items.invoice_id and i.owner_id = auth.uid())
  );

drop policy if exists "Owner payments access" on public.payments;
drop policy if exists "Owner reads payments" on public.payments;
drop policy if exists "Owner inserts payments" on public.payments;
drop policy if exists "Owner updates payments" on public.payments;
drop policy if exists "Owner deletes payments" on public.payments;
create policy "Owner reads payments" on public.payments
  for select to authenticated using (auth.uid() = owner_id);
create policy "Owner inserts payments" on public.payments
  for insert to authenticated with check (auth.uid() = owner_id and public.can_write_saas());
create policy "Owner updates payments" on public.payments
  for update to authenticated using (auth.uid() = owner_id and public.can_write_saas())
  with check (auth.uid() = owner_id and public.can_write_saas());
create policy "Owner deletes payments" on public.payments
  for delete to authenticated using (auth.uid() = owner_id and public.can_write_saas());

-- Plan metadata is a public-to-authenticated catalog, not owner-private data.
drop policy if exists "Authenticated reads subscription plans" on public.subscription_plans;
create policy "Authenticated reads subscription plans" on public.subscription_plans
  for select to authenticated using (true);
