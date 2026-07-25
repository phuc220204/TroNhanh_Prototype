-- ═══════════════════════════════════════════════════════════════════════════
-- 0300 — RÚT ---METADATA--- KHỎI description
--
-- VẤN ĐỀ: src/marketplace/utils/listingMetadata.ts JSON-serialize chi phí /
-- giờ giấc / địa điểm gần / lat-lng rồi APPEND vào cột `description` sau marker
-- '\n\n---METADATA---\n' (có đường legacy '---CURFEW_INFO---'), đọc ra thì parse lại.
--
-- HỆ QUẢ: chi phí & giờ giấc không filter được; và blob JSON đang nằm TRONG
-- ĐÚNG cột vừa được trigram-index ở migration 0200 → search sẽ match vào JSON.
-- Riêng điều đó là lý do phải làm việc này TRƯỚC khi bật search.
--
-- Xem docs/cp4/02_SCHEMA_DECISIONS.md §5
-- Idempotent: backfill chỉ chạm row còn marker, nên chạy lại an toàn.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Promote phần QUERY ĐƯỢC thành cột thật ────────────────────────────────
alter table public.rental_listings
  add column if not exists electricity_price numeric,
  add column if not exists water_price       numeric,
  add column if not exists water_unit        text check (water_unit in ('person', 'cubic')),
  add column if not exists service_price     numeric,
  add column if not exists deposit           numeric,
  add column if not exists access_policy     text check (access_policy in ('Free', 'Restricted')),
  add column if not exists access_open_time  time,
  add column if not exists access_close_time time,
  add column if not exists latitude          numeric,
  add column if not exists longitude         numeric,
  -- metadata CHỈ giữ `nearby` — thật sự phi cấu trúc, không bao giờ filter.
  add column if not exists metadata          jsonb not null default '{}'::jsonb;

-- ── BACKFILL: cả 2 marker ─────────────────────────────────────────────────
-- Giá trị chi phí trong JSON là string định dạng VND ("3.200.000đ") → strip mọi
-- ký tự không phải số. `curfew.time` có dạng "22:00 - 06:00".
do $$
declare
  r        record;
  j        jsonb;
  marker   text := E'\n\n---METADATA---\n';
  legacy   text := E'\n\n---CURFEW_INFO---\n';
  v_time   text;
begin
  -- Marker hiện hành
  for r in select id, description from public.rental_listings
           where description like '%---METADATA---%' loop
    begin
      j := nullif(split_part(r.description, marker, 2), '')::jsonb;
    exception when others then
      j := null;   -- JSON hỏng: vẫn cắt description, để cột chi phí null
    end;

    v_time := j -> 'curfew' ->> 'time';

    update public.rental_listings set
      description       = split_part(r.description, marker, 1),
      electricity_price = nullif(regexp_replace(coalesce(j->'costs'->>'electric', ''), '\D', '', 'g'), '')::numeric,
      water_price       = nullif(regexp_replace(coalesce(j->'costs'->>'water',    ''), '\D', '', 'g'), '')::numeric,
      water_unit        = case when j->'costs'->>'waterUnit' = 'cubic' then 'cubic' else 'person' end,
      service_price     = nullif(regexp_replace(coalesce(j->'costs'->>'service',  ''), '\D', '', 'g'), '')::numeric,
      deposit           = nullif(regexp_replace(coalesce(j->'costs'->>'deposit',  ''), '\D', '', 'g'), '')::numeric,
      access_policy     = case when j->'curfew'->>'type' = 'curfew' then 'Restricted' else 'Free' end,
      access_open_time  = case when v_time ~ '^\s*\d{1,2}:\d{2}'
                               then (split_part(v_time, '-', 1))::time else null end,
      access_close_time = case when v_time ~ '-\s*\d{1,2}:\d{2}'
                               then (split_part(v_time, '-', 2))::time else null end,
      latitude          = nullif(j->'coords'->>'lat', '')::numeric,
      longitude         = nullif(j->'coords'->>'lng', '')::numeric,
      metadata          = jsonb_build_object('nearby', coalesce(j->'nearby', '[]'::jsonb))
    where id = r.id;
  end loop;

  -- Marker legacy: chỉ chứa curfew
  for r in select id, description from public.rental_listings
           where description like '%---CURFEW_INFO---%' loop
    begin
      j := nullif(split_part(r.description, legacy, 2), '')::jsonb;
    exception when others then
      j := null;
    end;

    v_time := j ->> 'time';

    update public.rental_listings set
      description       = split_part(r.description, legacy, 1),
      access_policy     = case when j->>'type' = 'curfew' then 'Restricted' else 'Free' end,
      access_open_time  = case when v_time ~ '^\s*\d{1,2}:\d{2}'
                               then (split_part(v_time, '-', 1))::time else null end,
      access_close_time = case when v_time ~ '-\s*\d{1,2}:\d{2}'
                               then (split_part(v_time, '-', 2))::time else null end
    where id = r.id;
  end loop;
end $$;

-- ── Mặc định hợp lý cho row chưa từng có metadata ─────────────────────────
update public.rental_listings
  set access_policy = 'Free'
  where access_policy is null;

-- ĐƯỜNG DI CHUYỂN Ở CLIENT (xem T06):
--   write path: NGỪNG gọi appendMetadataToDescription NGAY.
--   read  path: GIỮ parseMetadataFromDescription làm fallback 1 release
--               (nó trả default hợp lý khi không có marker → vô hại sau backfill).
--   formatVND / cleanVND: GIỮ LẠI, không liên quan và đang dùng chỗ khác.
