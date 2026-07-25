-- ═══════════════════════════════════════════════════════════════════════════
-- 0900b — RPC FEATURES (3, 4, 8, 9, 10, 11, 12) + confirm_occupancy_link
--
-- Luật giống 0900: security definer ⇒ assert ownership BÊN TRONG là biên bảo mật.
-- Xem docs/cp4/03_RPC_CONTRACTS.md
-- Idempotent: create or replace.
-- ═══════════════════════════════════════════════════════════════════════════

-- ══ 3. moderate_listing ═══════════════════════════════════════════════════
-- Đây là lý do moderator CỐ Ý KHÔNG có policy UPDATE trên rental_listings:
-- mọi transition bị buộc đi qua đây ⇒ audit trail không thể bỏ sót.
create or replace function public.moderate_listing(
  p_listing_id uuid,
  p_action     text,
  p_reason     text default null
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid; v_ttl integer;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.is_moderator() then raise exception 'FORBIDDEN'; end if;

  if p_action not in ('Approve','Reject','Hide','Restore') then
    raise exception 'INVALID_MODERATION_ACTION';
  end if;

  -- FR-064: reject BẮT BUỘC có lý do
  if p_action = 'Reject' and coalesce(trim(p_reason), '') = '' then
    raise exception 'REASON_REQUIRED';
  end if;

  select coalesce((value)::integer, 60) into v_ttl
    from public.platform_settings where key = 'listing_ttl_days';
  v_ttl := coalesce(v_ttl, 60);

  update public.rental_listings set
    status = case p_action
               when 'Approve' then 'Active'
               when 'Reject'  then 'Rejected'
               when 'Hide'    then 'Hidden'
               when 'Restore' then 'Active'
             end,
    approved_at = case when p_action in ('Approve','Restore') then now() else approved_at end,
    -- BR-026: tin được duyệt có hạn 60 ngày
    expire_at   = case when p_action in ('Approve','Restore')
                       then now() + (v_ttl || ' days')::interval else expire_at end,
    rejection_reason = case when p_action = 'Reject' then p_reason else null end,
    moderated_by = v_uid,
    moderated_at = now()
  where id = p_listing_id and deleted_at is null;

  if not found then raise exception 'LISTING_NOT_FOUND'; end if;

  insert into public.moderation_logs (target_type, target_id, moderator_id, action, reason)
  values ('RentalListing', p_listing_id, v_uid, p_action, p_reason);
end $$;

-- ══ 4. create_occupancy_with_contract ═════════════════════════════════════
create or replace function public.create_occupancy_with_contract(
  p_room_id   uuid,
  p_occupant  jsonb,
  p_contract  jsonb
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid          uuid;
  v_owner        uuid;
  v_occupancy_id uuid;
  v_contract_id  uuid;
  v_start        date;
  v_end          date;
  v_link_user    uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select owner_id into v_owner from public.rooms
    where id = p_room_id and deleted_at is null for update;
  if v_owner is null      then raise exception 'ROOM_NOT_OWNED'; end if;
  if v_owner <> v_uid     then raise exception 'ROOM_NOT_OWNED'; end if;

  v_start := (p_contract ->> 'start_date')::date;
  v_end   := (p_contract ->> 'end_date')::date;
  if v_end <= v_start then raise exception 'INVALID_CONTRACT_PERIOD'; end if;

  -- BR-006: không 2 hợp đồng Active chồng thời gian trên cùng phòng
  if exists (
    select 1 from public.contracts
    where room_id = p_room_id and status = 'Active' and deleted_at is null
      and (start_date, end_date) overlaps (v_start, v_end)
  ) then raise exception 'ROOM_HAS_ACTIVE_CONTRACT'; end if;

  v_link_user := nullif(p_occupant ->> 'user_id', '')::uuid;

  insert into public.occupancies (
    room_id, owner_id, user_id, full_name, phone_number,
    start_date, end_date, occupant_count, is_active, link_status
  ) values (
    p_room_id,
    v_uid,                                    -- ← KHÔNG lấy từ payload
    v_link_user,
    p_occupant ->> 'full_name',
    p_occupant ->> 'phone_number',
    v_start,
    nullif(p_occupant ->> 'end_date', '')::date,
    coalesce((p_occupant ->> 'occupant_count')::integer, 1),
    true,
    -- BR-029: KHÔNG BAO GIỜ tự động 'Confirmed'. Renter phải tự xác nhận.
    -- Đây là toàn bộ giá trị chống gian lận của review verified-only.
    case when v_link_user is not null then 'Pending' else null end
  ) returning id into v_occupancy_id;

  insert into public.contracts (
    room_id, occupancy_id, owner_id, start_date, end_date, rent_price, deposit, status
  ) values (
    p_room_id, v_occupancy_id, v_uid, v_start, v_end,
    (p_contract ->> 'rent_price')::numeric,
    coalesce((p_contract ->> 'deposit')::numeric, 0),
    'Active'
  ) returning id into v_contract_id;

  update public.rooms set status = 'Rented' where id = p_room_id;

  -- BR-027: tin đăng liên kết chuyển sang Đã cho thuê.
  -- Đây là điểm nối marketplace ↔ workspace HỢP LỆ vì nó server-side.
  update public.rental_listings set status = 'Rented'
    where room_id = p_room_id and status in ('Active', 'PendingApproval') and deleted_at is null;

  return jsonb_build_object('occupancy_id', v_occupancy_id, 'contract_id', v_contract_id);
end $$;

-- ══ confirm_occupancy_link (BR-029) — Renter tự xác nhận ══════════════════
-- Cần thiết vì link_status='Confirmed' là điều kiện của can_review_contract().
-- Siết ở đây thật, thay cho policy UPDATE rộng ở migration 0500.
create or replace function public.confirm_occupancy_link(
  p_occupancy_id uuid,
  p_accept       boolean
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  update public.occupancies
    set link_status = case when p_accept then 'Confirmed' else 'Rejected' end
    where id = p_occupancy_id
      and user_id = v_uid                 -- chỉ chính chủ
      and link_status = 'Pending'         -- chỉ khi đang chờ
      and deleted_at is null;

  if not found then raise exception 'FORBIDDEN'; end if;
end $$;

-- ══ 8. post_review ════════════════════════════════════════════════════════
create or replace function public.post_review(
  p_contract_id uuid,
  p_rating      integer,
  p_content     text default null
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid; v_property uuid; v_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  if p_rating < 1 or p_rating > 5 then raise exception 'INVALID_RATING'; end if;

  -- Encode BR-022 + BR-029 + BR-030
  if not public.can_review_contract(v_uid, p_contract_id) then
    raise exception 'REVIEW_NOT_ELIGIBLE';
  end if;

  -- property_id DERIVE từ contract → room, KHÔNG nhận từ client
  select r.property_id into v_property
    from public.contracts c join public.rooms r on r.id = c.room_id
    where c.id = p_contract_id;
  if v_property is null then raise exception 'REVIEW_NOT_ELIGIBLE'; end if;

  begin
    insert into public.reviews (property_id, author_user_id, contract_id, rating, content)
    values (v_property, v_uid, p_contract_id, p_rating, p_content)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'REVIEW_ALREADY_EXISTS';   -- BR-023
  end;

  return v_id;
end $$;

-- ══ 9. reply_to_review ════════════════════════════════════════════════════
create or replace function public.reply_to_review(
  p_review_id uuid,
  p_reply     text
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid; v_owner uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select p.owner_id into v_owner
    from public.reviews rv join public.properties p on p.id = rv.property_id
    where rv.id = p_review_id and rv.deleted_at is null;

  if v_owner is null or v_owner <> v_uid then raise exception 'FORBIDDEN'; end if;

  update public.reviews
    set seller_reply = p_reply, seller_replied_at = now()
    where id = p_review_id;
end $$;

-- ══ hide_review (Moderator) ═══════════════════════════════════════════════
create or replace function public.hide_review(
  p_review_id uuid,
  p_reason    text
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.is_moderator() then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;

  update public.reviews set status = 'Hidden' where id = p_review_id;
  if not found then raise exception 'REVIEW_NOT_FOUND'; end if;

  insert into public.moderation_logs (target_type, target_id, moderator_id, action, reason)
  values ('Review', p_review_id, v_uid, 'Hide', p_reason);
end $$;

-- ══ 10. start_conversation ════════════════════════════════════════════════
create or replace function public.start_conversation(
  p_ref_type      text,
  p_ref_id        uuid,
  p_first_message text default null
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid; v_poster uuid; v_conv uuid; v_status text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_ref_type not in ('RentalListing','DemandPost') then raise exception 'INVALID_REF_TYPE'; end if;

  -- ── poster_id RESOLVE SERVER-SIDE ─────────────────────────────────────
  -- Nhận từ client sẽ cho phép bất kỳ ai mở thread "TỪ" người khác.
  if p_ref_type = 'RentalListing' then
    select seller_id, status into v_poster, v_status
      from public.rental_listings where id = p_ref_id and deleted_at is null;
    if v_poster is null then raise exception 'LISTING_NOT_CONTACTABLE'; end if;
    -- BR-019
    if v_status <> 'Active' then raise exception 'LISTING_NOT_CONTACTABLE'; end if;
  else
    select renter_id, status into v_poster, v_status
      from public.demand_posts where id = p_ref_id and deleted_at is null;
    if v_poster is null or v_status <> 'Active' then raise exception 'LISTING_NOT_CONTACTABLE'; end if;
  end if;

  -- BR-030
  if v_poster = v_uid then raise exception 'SELF_CONTACT_FORBIDDEN'; end if;

  -- BR-019: idempotent "mở lại hội thoại cũ"
  insert into public.conversations (ref_type, ref_id, initiator_id, poster_id)
  values (p_ref_type, p_ref_id, v_uid, v_poster)
  on conflict (initiator_id, ref_type, ref_id) do update
    set status = case when conversations.status = 'Archived'
                      then 'Active' else conversations.status end
  returning id into v_conv;

  if coalesce(trim(p_first_message), '') <> '' then
    insert into public.messages (conversation_id, sender_id, content)
    values (v_conv, v_uid, p_first_message);
  end if;

  return v_conv;
end $$;

-- ══ mark_conversation_read ════════════════════════════════════════════════
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid; v_conv public.conversations;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select * into v_conv from public.conversations where id = p_conversation_id;
  if not found or v_uid not in (v_conv.initiator_id, v_conv.poster_id) then
    raise exception 'FORBIDDEN';
  end if;

  update public.messages set is_read = true, read_at = now()
    where conversation_id = p_conversation_id and sender_id <> v_uid and is_read = false;

  update public.conversations set
    initiator_unread = case when v_uid = v_conv.initiator_id then 0 else initiator_unread end,
    poster_unread    = case when v_uid = v_conv.poster_id    then 0 else poster_unread end
  where id = p_conversation_id;
end $$;

-- ══ 11. grant_role / revoke_role ══════════════════════════════════════════
-- ⚠️ p_role CHỈ ĐƯỢC LÀ 'Seller' hoặc 'Moderator'.
-- 'Admin' là BOOTSTRAP-ONLY (SQL snippet thủ công, xem 06_QA_CHECKLIST.md).
-- KHÔNG BAO GIỜ tạo hàm client-callable kiểu claim_admin — đó là backdoor sẽ
-- sống sót vào production.
create or replace function public.grant_role(p_user_id uuid, p_role text)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.has_role(v_uid, 'Admin') then raise exception 'FORBIDDEN'; end if;
  if p_role not in ('Seller','Moderator') then raise exception 'ROLE_NOT_GRANTABLE'; end if;

  insert into public.user_roles (user_id, role, granted_by)
  values (p_user_id, p_role, v_uid)
  on conflict (user_id, role) do nothing;

  insert into public.moderation_logs (target_type, target_id, moderator_id, action, reason)
  values ('User', p_user_id, v_uid, 'Restore', 'grant role ' || p_role);
end $$;

create or replace function public.revoke_role(p_user_id uuid, p_role text)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.has_role(v_uid, 'Admin') then raise exception 'FORBIDDEN'; end if;
  if p_role not in ('Seller','Moderator') then raise exception 'ROLE_NOT_GRANTABLE'; end if;

  delete from public.user_roles where user_id = p_user_id and role = p_role;

  insert into public.moderation_logs (target_type, target_id, moderator_id, action, reason)
  values ('User', p_user_id, v_uid, 'Lock', 'revoke role ' || p_role);
end $$;

-- ══ 12. set_platform_setting ══════════════════════════════════════════════
create or replace function public.set_platform_setting(p_key text, p_value jsonb)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.has_role(v_uid, 'Admin') then raise exception 'FORBIDDEN'; end if;

  insert into public.platform_settings (key, value, updated_at)
  values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end $$;

-- ══ GRANTS ════════════════════════════════════════════════════════════════
revoke execute on function public.moderate_listing(uuid, text, text)                    from public, anon;
revoke execute on function public.create_occupancy_with_contract(uuid, jsonb, jsonb)     from public, anon;
revoke execute on function public.confirm_occupancy_link(uuid, boolean)                  from public, anon;
revoke execute on function public.post_review(uuid, integer, text)                       from public, anon;
revoke execute on function public.reply_to_review(uuid, text)                            from public, anon;
revoke execute on function public.hide_review(uuid, text)                                from public, anon;
revoke execute on function public.start_conversation(text, uuid, text)                   from public, anon;
revoke execute on function public.mark_conversation_read(uuid)                           from public, anon;
revoke execute on function public.grant_role(uuid, text)                                 from public, anon;
revoke execute on function public.revoke_role(uuid, text)                                from public, anon;
revoke execute on function public.set_platform_setting(text, jsonb)                      from public, anon;

grant execute on function public.moderate_listing(uuid, text, text)                    to authenticated;
grant execute on function public.create_occupancy_with_contract(uuid, jsonb, jsonb)     to authenticated;
grant execute on function public.confirm_occupancy_link(uuid, boolean)                  to authenticated;
grant execute on function public.post_review(uuid, integer, text)                       to authenticated;
grant execute on function public.reply_to_review(uuid, text)                            to authenticated;
grant execute on function public.hide_review(uuid, text)                                to authenticated;
grant execute on function public.start_conversation(text, uuid, text)                   to authenticated;
grant execute on function public.mark_conversation_read(uuid)                            to authenticated;
grant execute on function public.grant_role(uuid, text)                                 to authenticated;
grant execute on function public.revoke_role(uuid, text)                                to authenticated;
grant execute on function public.set_platform_setting(text, jsonb)                      to authenticated;
