-- ═══════════════════════════════════════════════════════════════════════════
-- Lưu tin yêu thích (saved / favorites)
--
-- HIỆN TRẠNG: bốn nút hình trái tim (HomePage, AllListingsPage,
-- SearchResultsPage, RoomDetailPage) đều chạy `useState(false)` local — bấm thì
-- tim đổi màu, reload là mất. Không có bảng, không có route xem lại. Tức là một
-- tính năng chỉ tồn tại trong 1 lần render.
--
-- Gộp "Yêu thích" và "Tin đã lưu" thành MỘT khái niệm, theo quyết định của chủ
-- dự án: hai cái vốn cùng nghĩa, tách ra chỉ làm người dùng đi tìm tin đã lưu ở
-- hai chỗ khác nhau.
--
-- ── VÌ SAO KHÔNG CẦN RPC ───────────────────────────────────────────────────
-- §6 buộc dùng RPC cho nhóm thao tác ĐA BẢNG. Lưu/bỏ lưu chỉ chạm một bảng, nên
-- insert/delete trực tiếp qua PostgREST là đủ — miễn là RLS cưỡng chế được
-- "chỉ ghi dòng của chính mình", và đó chính là việc `with check` làm dưới đây.
--
-- ── `user_id` DEFAULT auth.uid() — cố ý ────────────────────────────────────
-- Client KHÔNG gửi `user_id`. Nó là giá trị nhạy cảm theo nghĩa §6.1: nhận từ
-- client là cho client tự chọn lưu tin vào giỏ của người khác. Có `default` thì
-- client không có cơ hội gửi, và `with check (user_id = auth.uid())` chặn cả
-- trường hợp cố tình gửi.
--
-- Idempotent: if not exists + drop policy if exists.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.saved_listings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  listing_id uuid not null references public.rental_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Lưu hai lần cùng một tin là vô nghĩa; unique biến "bấm tim lần nữa" thành
  -- lỗi 23505 rõ ràng thay vì âm thầm tạo dòng thứ hai.
  unique (user_id, listing_id)
);

-- Truy vấn chính là "mọi tin tôi đã lưu, mới nhất trước".
create index if not exists idx_saved_listings_user
  on public.saved_listings (user_id, created_at desc);

alter table public.saved_listings enable row level security;

-- Ba policy, đều `to authenticated`: khách chưa đăng nhập không có gì để lưu.
-- Cố ý KHÔNG có policy UPDATE — sửa một dòng "đã lưu" không có nghĩa gì; thao
-- tác duy nhất là lưu hoặc bỏ lưu.
drop policy if exists "Users read own saved listings" on public.saved_listings;
create policy "Users read own saved listings" on public.saved_listings
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users save listings" on public.saved_listings;
create policy "Users save listings" on public.saved_listings
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users unsave listings" on public.saved_listings;
create policy "Users unsave listings" on public.saved_listings
  for delete to authenticated using (user_id = auth.uid());
