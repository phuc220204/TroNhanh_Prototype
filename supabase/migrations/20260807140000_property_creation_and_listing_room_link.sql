-- ═══════════════════════════════════════════════════════════════════════════
-- Tạo khu trọ bằng tay + gán phòng cho tin đăng đã có
--
-- HAI LỖ CHỨC NĂNG, phát hiện khi chủ dự án đi luồng thật trên DB trống:
--
-- 1. KHÔNG CÓ ĐƯỜNG TẠO KHU TRỌ. Không service, không UI. Nút "Tạo khu trọ đầu
--    tiên" ở dashboard chỉ điều hướng sang /chu-tro/quan-ly-phong — nơi cũng
--    không có nút tạo khu. Vòng lặp chết. Cách duy nhất có khu là bấm "Khởi tạo
--    dữ liệu mẫu", tức là chủ trọ thật không dùng được module SaaS.
--
-- 2. `update_listing_with_details` KHÔNG cập nhật `room_id`. Tin đăng tạo xong là
--    vĩnh viễn không gán được phòng, nên cột "Phòng liên kết" luôn "—" và BR-027
--    ("phòng chuyển Rented → tin đăng liên kết chuyển Rented") không có gì để
--    chạy trên đó.
--
-- Idempotent: alter ... set default (lặp lại vô hại) + create or replace.
-- ═══════════════════════════════════════════════════════════════════════════

-- ══ 1. `owner_id` tự điền từ phiên đăng nhập ═══════════════════════════════
-- Policy `for all using (auth.uid() = owner_id)` đã chặn được việc ghi row của
-- người khác. Nhưng để client GỬI `owner_id` vẫn là thói quen xấu theo §6.1: nó
-- biến một giá trị danh tính thành tham số, và chỗ nào quên gửi thì insert fail
-- với lỗi NOT NULL khó hiểu thay vì chạy đúng.
--
-- Có default thì service chỉ gửi dữ liệu nghiệp vụ; danh tính do Postgres điền.
alter table public.properties alter column owner_id set default auth.uid();
alter table public.rooms      alter column owner_id set default auth.uid();

-- ══ 2. link_listing_to_room ════════════════════════════════════════════════
-- Gán / bỏ gán phòng cho một tin đăng ĐÃ CÓ.
--
-- Vì sao phải là RPC chứ không phải `.update({ room_id })` từ client: cần assert
-- HAI quyền sở hữu cùng lúc — tin đăng là của tôi, VÀ phòng cũng là của tôi.
-- RLS trên `rental_listings` chỉ kiểm điều thứ nhất; không có gì ngăn tôi gán
-- phòng của người khác vào tin của mình, và khi đó BR-027 sẽ đổi trạng thái tin
-- của tôi theo phòng người ta.
--
-- CỐ Ý KHÔNG đổi `status` của tin ở đây. Gán phòng không phải là "sửa field quan
-- trọng" theo BR-003 (không đổi giá, tiêu đề, địa chỉ, diện tích, loại hình), nên
-- không có lý do đẩy tin đang Active về PendingApproval.
create or replace function public.link_listing_to_room(
  p_listing_id uuid,
  p_room_id    uuid
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid          uuid;
  v_listing_owner uuid;
  v_room_owner   uuid;
  v_property_id  uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select seller_id into v_listing_owner
    from public.rental_listings
   where id = p_listing_id and deleted_at is null
     for update;

  if v_listing_owner is null  then raise exception 'LISTING_NOT_FOUND'; end if;
  if v_listing_owner <> v_uid then raise exception 'FORBIDDEN'; end if;

  -- p_room_id null = BỎ gán. Vẫn hợp lệ, không phải lỗi.
  if p_room_id is null then
    update public.rental_listings
       set room_id = null, property_id = null, updated_at = now()
     where id = p_listing_id;
    return;
  end if;

  select owner_id, property_id into v_room_owner, v_property_id
    from public.rooms
   where id = p_room_id and deleted_at is null;

  if v_room_owner is null  then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room_owner <> v_uid then raise exception 'ROOM_NOT_OWNED'; end if;

  -- Một phòng chỉ nên đứng sau MỘT tin đang hiển thị. Hai tin cùng trỏ một phòng
  -- thì BR-027 đổi trạng thái cả hai, và người tìm trọ thấy hai tin cho cùng chỗ ở.
  if exists (
    select 1 from public.rental_listings
     where room_id = p_room_id
       and id <> p_listing_id
       and deleted_at is null
       and status in ('Active', 'PendingApproval')
  ) then
    raise exception 'ROOM_ALREADY_LISTED';
  end if;

  -- `property_id` suy ra từ phòng, KHÔNG nhận từ client — nếu để client gửi thì
  -- tin có thể trỏ tới một khu khác với khu của phòng.
  update public.rental_listings
     set room_id     = p_room_id,
         property_id = v_property_id,
         updated_at  = now()
   where id = p_listing_id;
end $$;

revoke execute on function public.link_listing_to_room(uuid, uuid) from public, anon;
grant  execute on function public.link_listing_to_room(uuid, uuid) to authenticated;
