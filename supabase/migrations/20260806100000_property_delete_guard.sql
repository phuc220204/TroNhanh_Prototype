-- ═══════════════════════════════════════════════════════════════════════════
-- BR-011 — Xóa khu trọ có guard (T27 mục 4)
--
-- HIỆN TRẠNG: KHÔNG có đường xóa khu nào cả — không UI, không service, không
--   RPC. `grep deleteProperty src` = 0 hit. Nên đây không phải "thêm guard vào
--   chức năng sẵn có" mà là tạo mới cả đường xóa, có guard ngay từ đầu.
--
-- VÌ SAO PHẢI LÀ RPC, không phải `.update({deleted_at})` từ client:
--   Guard "còn phòng Rented thì chặn" đọc bảng `rooms` rồi mới quyết định ghi
--   `properties`. Làm ở client thì giữa lúc đọc và lúc ghi có khoảng trống —
--   và quan trọng hơn: client tự bỏ qua bước đọc là xong. Guard ở client là
--   gợi ý, không phải ràng buộc. Ở đây nó là một câu lệnh nguyên tử.
--
-- ⚠️ `security definer` bypass RLS ⇒ assert ownership TRONG body chính là biên
--   bảo mật (CLAUDE.md §6.1). Không có assert = ai cũng xóa được khu của người khác.
--
-- PHẠM VI CÓ CHỦ ĐÍCH — hai thứ KHÔNG làm ở đây:
--   1. Không đụng `rental_listings`. Đó là bảng của marketplace (§2.1); tin đăng
--      trỏ tới khu vừa xóa sẽ thành mồ côi. Cần quyết định nghiệp vụ (ẩn tin? chặn
--      xóa?) — không phải hệ quả phụ của một migration kỹ thuật.
--   2. Chỉ chặn theo phòng `Rented`, đúng chữ của BR-011. Phòng `Deposited`
--      (đã nhận cọc) hiện KHÔNG chặn — cũng là câu hỏi nghiệp vụ để ngỏ.
--
-- Idempotent: create or replace.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.soft_delete_property(p_property_id uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid          uuid;
  v_owner        uuid;
  v_rented_count integer;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select owner_id into v_owner
    from public.properties
   where id = p_property_id
     and deleted_at is null;

  if v_owner is null  then raise exception 'PROPERTY_NOT_FOUND'; end if;
  if v_owner <> v_uid then raise exception 'PROPERTY_NOT_OWNED'; end if;

  -- BR-011: còn phòng đang cho thuê thì không được xóa khu.
  select count(*) into v_rented_count
    from public.rooms
   where property_id = p_property_id
     and deleted_at is null
     and status = 'Rented';

  if v_rented_count > 0 then
    raise exception 'PROPERTY_HAS_RENTED_ROOMS';
  end if;

  -- Soft delete phòng trước: nếu chỉ xóa khu, phòng sẽ mồ côi và vẫn hiện ở
  -- màn quản lý phòng (query ở đó lọc theo `rooms.deleted_at`, không join khu).
  update public.rooms
     set deleted_at = now(),
         updated_at = now()
   where property_id = p_property_id
     and deleted_at is null;

  update public.properties
     set deleted_at = now(),
         updated_at = now()
   where id = p_property_id;
end $$;

revoke execute on function public.soft_delete_property(uuid) from public, anon;
grant  execute on function public.soft_delete_property(uuid) to authenticated;

-- ══ Đếm phòng Rented để UI giải thích được TRƯỚC khi bấm ═══════════════════
-- Không phải để thay guard — guard nằm trong RPC ở trên. Cái này chỉ để nút
-- "Xóa khu" nói rõ "còn 3 phòng đang thuê" thay vì để người dùng bấm rồi ăn lỗi.
create or replace function public.count_rented_rooms(p_property_id uuid)
returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer
    from public.rooms r
    join public.properties p on p.id = r.property_id
   where r.property_id = p_property_id
     and r.deleted_at is null
     and r.status = 'Rented'
     and p.owner_id = auth.uid();   -- ← không cho dò khu của người khác
$$;

revoke execute on function public.count_rented_rooms(uuid) from public, anon;
grant  execute on function public.count_rented_rooms(uuid) to authenticated;
