-- "Thời gian đăng" hiển thị trên card = lúc tin hiển thị công khai LẦN ĐẦU.
--
-- Không dùng `approved_at`: cột này bị đặt lại mỗi lần duyệt (Approve/Restore →
-- now(), sửa nội dung quan trọng → null rồi duyệt lại). Nếu dùng nó, một tin đã
-- đăng 40 ngày chỉ cần sửa giá rồi được duyệt lại là hiện "Vừa đăng" + nhãn
-- "Mới đăng" — người bán lách được Boost miễn phí.
--
-- `first_published_at` chỉ được ghi MỘT lần bởi trigger, client không gán được:
--   - INSERT: now() nếu tin vào thẳng Active (tự duyệt), ngược lại null.
--   - UPDATE: giữ nguyên giá trị cũ; nếu còn null và tin vừa thành Active → now().

alter table public.rental_listings
  add column if not exists first_published_at timestamptz;

create or replace function public.set_listing_first_published_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.first_published_at := case when new.status = 'Active' then now() else null end;
  else
    new.first_published_at := old.first_published_at;
    if new.first_published_at is null and new.status = 'Active' then
      new.first_published_at := now();
    end if;
  end if;
  return new;
end $$;

revoke execute on function public.set_listing_first_published_at() from public, anon, authenticated;

drop trigger if exists trg_set_listing_first_published_at on public.rental_listings;
create trigger trg_set_listing_first_published_at
  before insert or update on public.rental_listings
  for each row execute function public.set_listing_first_published_at();

-- Backfill tin đã từng hiển thị. `approved_at` có thể đã bị đặt lại bởi lần duyệt
-- sau, nhưng là mốc tốt nhất còn lại; thiếu thì dùng `created_at`. Tắt trigger
-- người dùng trong lúc backfill để không đụng `updated_at` và các guard ghi.
alter table public.rental_listings disable trigger user;
update public.rental_listings
set first_published_at = coalesce(approved_at, created_at)
where first_published_at is null
  and (status in ('Active', 'Expired', 'Rented', 'Hidden') or approved_at is not null);
alter table public.rental_listings enable trigger user;
