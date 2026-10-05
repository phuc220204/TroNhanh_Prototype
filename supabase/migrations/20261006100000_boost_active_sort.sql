-- BR-005: tin ĐANG Boost xếp trước. Trước đây search sắp theo
-- `boost_payment_verified`, cột này không bao giờ về false sau khi hết hạn ⇒ tin
-- từng Boost đứng trên mọi tin thường mãi mãi.
--
-- Computed field của PostgREST: hàm nhận đúng row type, gọi được như một cột
-- (`order=is_boost_active.desc`). Không thể dùng generated column vì phụ thuộc now().
--
-- Không phải security definer: hàm chỉ đọc chính row mà caller đã được RLS cho
-- phép thấy, nên không lộ thêm gì. Phải grant cho anon vì marketplace công khai
-- sắp xếp bằng nó (CLAUDE.md §3.1).

create or replace function public.is_boost_active(listing public.rental_listings)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(listing.boost_payment_verified, false)
     and listing.boost_expire_at is not null
     and listing.boost_expire_at > now();
$$;

grant execute on function public.is_boost_active(public.rental_listings) to anon, authenticated;
