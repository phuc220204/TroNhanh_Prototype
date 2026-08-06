-- ═══════════════════════════════════════════════════════════════════════════
-- handle_new_user: chịu được cả tài khoản tạo từ Google OAuth
--
-- VẤN ĐỀ: trigger hiện tại đọc thẳng `raw_user_meta_data ->> 'full_name'` và
-- `'contact_phone'` — hai khoá do form đăng ký của app tự đặt. Tài khoản tạo qua
-- Google không có chúng theo cùng cách:
--   • Google trả `name`, `full_name`, `picture`, `avatar_url`, `email`
--   • KHÔNG có `contact_phone` (Google không cấp số điện thoại)
-- Nếu `full_name` vắng, `profiles.full_name` thành NULL và mọi chỗ hiển thị tên
-- rơi về "Chủ trọ" / "Người dùng" — người dùng Google mới đăng nhập đã thấy hệ
-- thống không biết tên mình.
--
-- CÁCH SỬA: chuỗi fallback `full_name` → `name` → phần trước @ của email.
-- `contact_phone` để rỗng, người dùng bổ sung ở /tai-khoan/cai-dat.
--
-- ⚠️ TRIGGER NÀY KHÔNG CHẠY KHI GOOGLE GỘP VÀO TÀI KHOẢN CŨ — và đó là đúng.
-- `on_auth_user_created` là `after insert on auth.users`. Khi Supabase gộp
-- identity Google vào một user đã tồn tại (cùng email, email đã xác minh), nó
-- chỉ thêm dòng vào `auth.identities`, KHÔNG insert user mới ⇒ trigger im lặng
-- và `profiles` cũ giữ nguyên. Nhờ vậy người đã có khu trọ, hợp đồng, hóa đơn
-- đăng nhập bằng Google vẫn vào đúng dữ liệu của mình — tên trong hồ sơ không bị
-- Google ghi đè.
--
-- Idempotent: create or replace. Trigger đang gắn trên auth.users không bị đụng.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_full_name text;
begin
  v_full_name := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  )), '');

  -- Vẫn không có tên: lấy phần trước @ của email. Thà "nguyenvana" còn hơn NULL,
  -- vì NULL sẽ hiện thành "Người dùng" ở mọi nơi.
  if v_full_name is null and new.email is not null then
    v_full_name := split_part(new.email, '@', 1);
  end if;

  insert into public.profiles (user_id, full_name, contact_phone, is_seller)
  values (
    new.id,
    v_full_name,
    -- Google không cấp số điện thoại; để rỗng, người dùng tự bổ sung sau.
    new.raw_user_meta_data ->> 'contact_phone',
    false
  )
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'Renter')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;
