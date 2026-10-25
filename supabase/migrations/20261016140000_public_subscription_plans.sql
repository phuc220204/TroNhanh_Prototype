-- Bảng giá công khai (/bang-gia): khách chưa đăng nhập đọc được danh mục gói.
--
-- `subscription_plans` chỉ có cột công khai (tên, giá, thời hạn, giới hạn khu/phòng)
-- — không có cột nhạy cảm nên dùng policy được, không cần view allow-list (§3.2
-- chỉ áp cho bảng có cột nhạy cảm). Vẫn KHÔNG có policy ghi: giá chỉ đổi qua SQL
-- có kiểm soát, checkout lấy giá server-side trong begin_saas_checkout.
-- Idempotent.

drop policy if exists "Authenticated reads subscription plans" on public.subscription_plans;
drop policy if exists "Public reads subscription plans" on public.subscription_plans;
create policy "Public reads subscription plans" on public.subscription_plans
  for select to anon, authenticated
  using (true);

revoke insert, update, delete, truncate on public.subscription_plans from anon, authenticated;
grant select on public.subscription_plans to anon, authenticated;
