-- ═══════════════════════════════════════════════════════════════════════════
-- 1200 — SỬA LỖI CHẶN ANON: cấp EXECUTE cho các helper được dùng TRONG POLICY
--
-- ⚠️ BUG NGHIÊM TRỌNG do migration 0400 gây ra, được supabase/tests/rls.sql bắt:
--    "permission denied for function is_moderator"
--
-- HẬU QUẢ: người dùng CHƯA ĐĂNG NHẬP không xem được BẤT KỲ tin đăng nào —
-- toàn bộ marketplace công khai hỏng.
--
-- VÌ SAO:
--   0400 viết `revoke execute on function public.is_moderator() from public, anon`.
--   Nhưng policy "Moderator views all listings" trên rental_listings KHÔNG ghi
--   mệnh đề `TO`, nên mặc định là TO PUBLIC — Postgres vẫn ĐÁNH GIÁ nó cho anon.
--   Anon gọi hàm mà không có EXECUTE ⇒ lỗi permission denied, và cả câu SELECT
--   bị CHẶN chứ không phải trả về rỗng.
--
-- BÀI HỌC (đã ghi vào CLAUDE.md §3.1):
--   Hàm security-definer dùng TRONG POLICY phải được grant cho MỌI role có thể
--   chạm bảng đó — kể cả role mà policy "không dành cho". Vì Postgres đánh giá
--   TẤT CẢ policy permissive rồi mới OR kết quả lại.
--
-- AN TOÀN: các hàm này chỉ trả boolean về CHÍNH NGƯỜI GỌI. Với anon thì
-- auth.uid() là null nên luôn trả false — không lộ dữ liệu của ai.
--
-- Idempotent: chạy lại an toàn.
-- ═══════════════════════════════════════════════════════════════════════════

-- is_moderator(): dùng trong policy của rental_listings, demand_posts,
-- reviews, moderation_logs, user_roles.
grant execute on function public.is_moderator() to anon;

-- owns_property(): dùng trong policy "Owner reads reviews of own property".
-- Anon đọc reviews công khai (BR-024) nên vẫn phải đánh giá policy này.
grant execute on function public.owns_property(uuid) to anon;

-- owns_room(): dự phòng cho policy tương lai trên rooms.
grant execute on function public.owns_room(uuid) to anon;

-- is_linked_occupant(): dùng trong policy của contracts, invoices, occupancies.
-- Các policy đó không ghi TO nên anon vẫn phải đánh giá chúng.
grant execute on function public.is_linked_occupant(uuid) to anon;

-- CỐ Ý KHÔNG cấp cho anon:
--   has_role(uuid, text)            — nhận uuid tùy ý, có thể dùng để dò
--                                     "user X có phải Admin không". Không dùng
--                                     trong policy nào nên không cần.
--   can_review_contract(uuid, uuid) — chỉ dùng trong policy `to authenticated`
--                                     (insert review), anon không bao giờ đánh giá.

-- ── Siết lại phạm vi policy cho đúng ý định ───────────────────────────────
-- Ghi rõ `to authenticated` cho các policy chỉ dành cho người đã đăng nhập.
-- Không bắt buộc về mặt bảo mật (hàm đã trả false cho anon), nhưng nó khiến ý
-- định của policy hiện rõ và Postgres bỏ qua sớm, đỡ một lần gọi hàm cho anon.
drop policy if exists "Moderator views all listings" on public.rental_listings;
create policy "Moderator views all listings" on public.rental_listings
  for select to authenticated using (public.is_moderator());

drop policy if exists "Moderator views all demand" on public.demand_posts;
create policy "Moderator views all demand" on public.demand_posts
  for select to authenticated using (public.is_moderator());

drop policy if exists "Seller views own listings" on public.rental_listings;
create policy "Seller views own listings" on public.rental_listings
  for select to authenticated using (auth.uid() = seller_id);

drop policy if exists "Renter views own demand posts" on public.demand_posts;
create policy "Renter views own demand posts" on public.demand_posts
  for select to authenticated using (auth.uid() = renter_id);

drop policy if exists "Owner reads reviews of own property" on public.reviews;
create policy "Owner reads reviews of own property" on public.reviews
  for select to authenticated using (public.owns_property(property_id));

drop policy if exists "Moderator reads all reviews" on public.reviews;
create policy "Moderator reads all reviews" on public.reviews
  for select to authenticated using (public.is_moderator());

drop policy if exists "Linked renter reads own contracts" on public.contracts;
create policy "Linked renter reads own contracts" on public.contracts
  for select to authenticated using (public.is_linked_occupant(occupancy_id));

drop policy if exists "Linked renter reads own invoices" on public.invoices;
create policy "Linked renter reads own invoices" on public.invoices
  for select to authenticated using (exists (
    select 1 from public.contracts c
    where c.id = invoices.contract_id and public.is_linked_occupant(c.occupancy_id)
  ));

drop policy if exists "Renter reads own occupancy" on public.occupancies;
create policy "Renter reads own occupancy" on public.occupancies
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Renter confirms own occupancy" on public.occupancies;
create policy "Renter confirms own occupancy" on public.occupancies
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Moderators read logs" on public.moderation_logs;
create policy "Moderators read logs" on public.moderation_logs
  for select to authenticated using (public.is_moderator());

drop policy if exists "Admin sees all" on public.user_roles;
create policy "Admin sees all" on public.user_roles
  for select to authenticated using (public.is_moderator());

drop policy if exists "See own roles" on public.user_roles;
create policy "See own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
