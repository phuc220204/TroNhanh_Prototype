-- ═══════════════════════════════════════════════════════════════════════════
-- update_room — SỬA một phòng đã tạo
--
-- LỖ CHỨC NĂNG: `createRoom` có, `updateRoom` không. Hệ quả trực tiếp của
-- migration `20260807170000` (đơn giá điện/nước theo từng phòng): đơn giá riêng
-- chỉ đặt được ĐÚNG MỘT LẦN, lúc tạo phòng. Chủ trọ muốn đổi giá một phòng đã
-- tạo — nghiệp vụ chính đã nêu khi làm tính năng đó, "3.500đ với hợp đồng cũ,
-- 3.700đ với phòng ký mới" — thì không có đường nào ngoài xóa phòng tạo lại.
-- Mà xóa phòng thì mất luôn chỉ số điện nước và hóa đơn của nó.
--
-- ── VÌ SAO PHẢI LÀ RPC, KHÔNG PHẢI `.from("rooms").update()` ───────────────
-- Sửa phòng chạm HAI bảng khi `status` đổi sang `Rented`: BR-027 buộc tin đăng
-- liên kết cũng chuyển `Rented`. Hiện BR-027 chỉ được cài BÊN TRONG
-- `create_occupancy_with_contract` — nghĩa là đổi trạng thái phòng bằng đường
-- nào khác thì tin đăng đứng im, và marketplace vẫn rao một phòng đã có người ở.
-- Đó đúng loại lỗi "sai thì im lặng": không ai thấy gì cho tới khi có người gọi
-- điện hỏi thuê phòng đã kín.
--
-- §6 CLAUDE.md: nhóm thao tác đa bảng phải atomic ⇒ gói trong một RPC.
--
-- ── CHỦ Ý KHÔNG LÀM CHIỀU NGƯỢC LẠI ───────────────────────────────────────
-- Phòng rời `Rented` (về `Available`) thì tin đăng KHÔNG tự quay lại `Active`.
-- Tin `Rented` → `Active` là ĐĂNG LẠI: nó lên marketplace, và với BR-003/BR-026
-- việc đó phải đi qua kiểm duyệt + tính lại hạn 60 ngày. Tự động hoá chiều đó
-- ở đây sẽ tạo một đường vòng qua kiểm duyệt bằng cách bấm hai lần đổi trạng
-- thái phòng. Chủ trọ muốn rao lại thì mở lại tin ở /chu-tro/tin-dang.
--
-- ── KHÔNG NHẬN TỪ CLIENT ──────────────────────────────────────────────────
-- `owner_id` và `property_id` không có trong tham số. Sở hữu đọc từ DB rồi so
-- với `auth.uid()`; chuyển phòng sang khu khác là nghiệp vụ khác (kéo theo hóa
-- đơn, hợp đồng, tin đăng đang trỏ tới) — không lẫn vào "sửa thông tin phòng".
--
-- Idempotent: create or replace.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.update_room(
  p_room_id           uuid,
  p_room_code         text,
  p_area              numeric,
  p_price             numeric,
  p_floor             integer,
  p_status            text,
  p_description       text,
  p_electricity_price numeric,
  p_water_price       numeric,
  p_service_fee       numeric
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid         uuid;
  v_owner       uuid;
  v_old_status  text;
  v_code        text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  -- `for update` khoá row: hai tab cùng sửa một phòng thì lượt sau đọc trạng
  -- thái đã cập nhật, nên nhánh BR-027 dưới đây không chạy hai lần.
  select owner_id, status into v_owner, v_old_status
    from public.rooms
   where id = p_room_id and deleted_at is null
     for update;

  if v_owner is null  then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_owner <> v_uid then raise exception 'ROOM_NOT_OWNED'; end if;

  -- ── Validate ở server (§7). Client cũng chặn, nhưng client không phải biên. ──
  v_code := btrim(coalesce(p_room_code, ''));
  if v_code = '' then raise exception 'ROOM_CODE_REQUIRED'; end if;

  if p_area is null  or p_area  <= 0 then raise exception 'INVALID_ROOM_AREA';  end if;
  if p_price is null or p_price <= 0 then raise exception 'INVALID_ROOM_PRICE'; end if;

  -- BR-002 — đúng 4 trạng thái. CHECK của bảng cũng chặn, nhưng nó ném 23514
  -- ("Dữ liệu không hợp lệ") — không nói được là sai ở đâu.
  if p_status not in ('Available', 'Deposited', 'Rented', 'Hidden') then
    raise exception 'INVALID_ROOM_STATUS';
  end if;

  -- `null` = theo giá khu; `0` = miễn phí. Số ÂM thì không có nghĩa nào cả và
  -- sẽ chui thẳng vào `utility_readings.unit_price` rồi ra hóa đơn âm tiền.
  if coalesce(p_electricity_price, 0) < 0
     or coalesce(p_water_price, 0) < 0
     or coalesce(p_service_fee, 0) < 0 then
    raise exception 'INVALID_UNIT_PRICE';
  end if;

  update public.rooms
     set room_code         = v_code,
         area              = p_area,
         price             = p_price,
         floor             = coalesce(p_floor, floor),
         status            = p_status,
         description       = nullif(btrim(coalesce(p_description, '')), ''),
         -- Gán thẳng, KHÔNG `coalesce(p_x, electricity_price)`: `null` ở đây là
         -- một ý định thật ("bỏ giá riêng, quay về giá khu"). Giữ giá trị cũ khi
         -- nhận null sẽ biến ô trống thành thao tác không làm gì được.
         electricity_price = p_electricity_price,
         water_price       = p_water_price,
         service_fee       = p_service_fee,
         updated_at        = now()
   where id = p_room_id;

  -- BR-027 — chỉ khi phòng THỰC SỰ chuyển sang Rented.
  if p_status = 'Rented' and v_old_status is distinct from 'Rented' then
    update public.rental_listings
       set status     = 'Rented',
           updated_at = now()
     where room_id = p_room_id
       and status in ('Active', 'PendingApproval')
       and deleted_at is null;
  end if;
end $$;

revoke execute on function public.update_room(uuid, text, numeric, numeric, integer, text, text, numeric, numeric, numeric) from public, anon;
grant  execute on function public.update_room(uuid, text, numeric, numeric, integer, text, text, numeric, numeric, numeric) to authenticated;
