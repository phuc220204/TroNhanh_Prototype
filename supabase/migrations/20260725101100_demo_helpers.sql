-- ═══════════════════════════════════════════════════════════════════════════
-- 1000 — DEMO HELPERS
--
-- ⚠️⚠️  DROP TRƯỚC PRODUCTION. Xem docs/cp4/02_SCHEMA_DECISIONS.md §13.
--
-- VÌ SAO CẦN: review verified-only (BR-022) đòi occupancy link_status='Confirmed'
-- + hợp đồng ≥30 ngày (hoặc ≥1 payment) + không phải chủ khu. KHÔNG có gì trên
-- một DB demo sạch thoả điều kiện đó ⇒ luồng 4a (đánh giá chủ trọ) không thể
-- demo được.
--
-- ❌ KHÔNG giải bằng cách nới can_review_contract(). Cổng 30 ngày LÀ toàn bộ giá
--    trị chống gian lận của tính năng, và giám khảo rất có thể hỏi đúng chỗ đó.
--
-- ✅ Giải bằng hàm demo_* có phạm vi bị chặn cứng, mang tiền tố demo_, và nằm
--    trong danh sách drop-trước-production.
-- ═══════════════════════════════════════════════════════════════════════════

-- ══ 14. demo_link_me_to_seeded_occupancy ══════════════════════════════════
-- KHÔNG có ownership assert được — ĐÓ CHÍNH LÀ MỤC ĐÍCH (nó gắn caller vào một
-- occupancy mà caller không sở hữu). Nên phạm vi phải bị chặn bằng 3 ràng buộc:
--   1. chỉ occupancy có user_id is null (chưa ai nhận)
--   2. chỉ trong property mà CHỦ có email kết thúc '@tronhanh.demo'
--   3. tên mang tiền tố demo_ + có trong danh sách drop-trước-production
create or replace function public.demo_link_me_to_seeded_occupancy(
  p_property_id uuid default null
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid       uuid;
  v_occupancy uuid;
  v_contract  uuid;
  v_invoice   uuid;
  v_rent      numeric;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  -- Tìm 1 occupancy chưa ai nhận, thuộc property của một chủ trọ DEMO,
  -- và caller KHÔNG phải chủ property đó (BR-030 vẫn phải đúng).
  select o.id, c.id, c.rent_price
    into v_occupancy, v_contract, v_rent
  from public.occupancies o
  join public.rooms      r on r.id = o.room_id
  join public.properties p on p.id = r.property_id
  join auth.users        u on u.id = p.owner_id
  left join public.contracts c on c.occupancy_id = o.id and c.deleted_at is null
  where o.user_id is null
    and o.deleted_at is null
    and p.owner_id <> v_uid                      -- không tự review khu mình
    and u.email like '%@tronhanh.demo'           -- ← ràng buộc phạm vi demo
    and (p_property_id is null or p.id = p_property_id)
    and c.id is not null
  order by o.created_at
  limit 1;

  if v_occupancy is null then raise exception 'DEMO_NO_AVAILABLE_OCCUPANCY'; end if;

  -- Gắn + xác nhận luôn (bỏ qua bước Renter tự confirm, chỉ cho demo)
  update public.occupancies
    set user_id = v_uid, link_status = 'Confirmed'
    where id = v_occupancy;

  -- Backdate để thoả BR-022 (≥30 ngày).
  -- ⚠️ CHỈ chấp nhận được trên DB demo. Đây là lý do hàm phải bị drop.
  update public.contracts
    set created_at = now() - interval '60 days',
        start_date = (current_date - 60)
    where id = v_contract;

  -- Thêm 1 payment để nhánh thứ 2 của BR-022 cũng thoả (phòng khi backdate bị
  -- ai đó xoá đi mà vẫn muốn demo được).
  select id into v_invoice from public.invoices
    where contract_id = v_contract and deleted_at is null
    order by created_at limit 1;

  if v_invoice is not null then
    insert into public.payments (invoice_id, owner_id, amount, method, paid_at, purpose)
    select v_invoice, i.owner_id, coalesce(v_rent, i.total_amount), 'Cash',
           now() - interval '30 days', 'RentInvoice'
    from public.invoices i where i.id = v_invoice
      and not exists (select 1 from public.payments where invoice_id = v_invoice);
    update public.invoices set status = 'Paid' where id = v_invoice;
  end if;

  return v_contract;
end $$;

revoke execute on function public.demo_link_me_to_seeded_occupancy(uuid) from public, anon;
grant  execute on function public.demo_link_me_to_seeded_occupancy(uuid) to authenticated;

-- ══ demo_enable_property_public_profile ═══════════════════════════════════
-- BR-024: review chỉ hiện công khai khi khu bật is_public_profile_enabled.
-- Bật nhanh cho khu demo + sinh slug, để trang /khu-tro/:slug có thể mở được.
create or replace function public.demo_enable_public_profiles()
returns integer
language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid; v_count integer;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  -- Chỉ tác động lên khu của CHÍNH caller (nên hàm này an toàn hơn hàm trên).
  update public.properties set
    is_public_profile_enabled = true,
    public_slug = coalesce(
      public_slug,
      lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || left(id::text, 6)
    )
  where owner_id = v_uid and deleted_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke execute on function public.demo_enable_public_profiles() from public, anon;
grant  execute on function public.demo_enable_public_profiles() to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- DROP TRƯỚC PRODUCTION:
--   drop function if exists public.demo_link_me_to_seeded_occupancy(uuid);
--   drop function if exists public.demo_enable_public_profiles();
-- ═══════════════════════════════════════════════════════════════════════════
