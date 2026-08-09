-- ═══════════════════════════════════════════════════════════════════════════
-- Gia hạn hợp đồng đang hiệu lực (T28 nhóm C — mục C2)
--
-- HIỆN TRẠNG: chỉ có `terminate_contract`. Không có đường gia hạn, nên nút
-- "Gia hạn" ở dashboard trước đây chỉ bung `alert("[Demo] ...")` — báo thành
-- công một việc chưa hề xảy ra.
--
-- Nghiệp vụ: hợp đồng hết hạn mà người ở tiếp tục ở là chuyện thường ngày của
-- chủ trọ. Gia hạn = dời `end_date`, GIỮ NGUYÊN occupancy và mọi hóa đơn cũ.
-- Cố ý KHÔNG tạo hợp đồng mới: tạo mới sẽ đụng BR-006 (hai hợp đồng Active
-- chồng thời gian trên cùng phòng) và làm đứt lịch sử `invoices.contract_id`.
--
-- ⚠️ `security definer` bypass RLS ⇒ assert ownership trong body CHÍNH LÀ biên
-- bảo mật (CLAUDE.md §6.1).
--
-- Idempotent: create or replace.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.extend_contract(
  p_contract_id  uuid,
  p_new_end_date date
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid        uuid;
  v_owner      uuid;
  v_room_id    uuid;
  v_start_date date;
  v_end_date   date;
  v_status     text;
  v_conflicts  integer;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select owner_id, room_id, start_date, end_date, status
    into v_owner, v_room_id, v_start_date, v_end_date, v_status
    from public.contracts
   where id = p_contract_id and deleted_at is null
     for update;

  if v_owner is null  then raise exception 'CONTRACT_NOT_FOUND'; end if;
  if v_owner <> v_uid then raise exception 'CONTRACT_NOT_OWNED'; end if;

  -- Chỉ gia hạn hợp đồng còn hiệu lực. Hợp đồng đã Terminated/Expired thì
  -- nghiệp vụ đúng là ký hợp đồng mới, không phải hồi sinh hợp đồng cũ.
  if v_status <> 'Active' then raise exception 'CONTRACT_NOT_ACTIVE'; end if;

  if p_new_end_date is null or p_new_end_date <= v_end_date then
    raise exception 'EXTEND_DATE_NOT_LATER';
  end if;

  -- BR-006 — không để hợp đồng sau khi gia hạn chồng thời gian với một hợp đồng
  -- Active khác trên CÙNG phòng. Điều kiện chồng nhau của hai khoảng ngày:
  -- a.start <= b.end AND b.start <= a.end.
  select count(*) into v_conflicts
    from public.contracts c
   where c.room_id = v_room_id
     and c.id <> p_contract_id
     and c.deleted_at is null
     and c.status = 'Active'
     and c.start_date <= p_new_end_date
     and v_start_date  <= c.end_date;

  if v_conflicts > 0 then
    raise exception 'ROOM_HAS_ACTIVE_CONTRACT';
  end if;

  update public.contracts
     set end_date   = p_new_end_date,
         updated_at = now()
   where id = p_contract_id;
end $$;

revoke execute on function public.extend_contract(uuid, date) from public, anon;
grant  execute on function public.extend_contract(uuid, date) to authenticated;
