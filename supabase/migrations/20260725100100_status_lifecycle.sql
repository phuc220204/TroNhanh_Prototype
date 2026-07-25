-- ═══════════════════════════════════════════════════════════════════════════
-- 0100 — STATUS LIFECYCLE (BR-001, BR-002, BR-029)
--
-- Mở rộng vòng đời RentalListing / DemandPost theo BR-001, thêm cột kiểm duyệt,
-- và thêm link_status cho Occupancy (cổng chống review gian lận, BR-029).
--
-- QUYẾT ĐỊNH: KHÔNG thêm 'Inactive' (listings) và 'Repairing' (rooms) vào CHECK.
--   'Inactive'  là typo, không tồn tại trong BR-001 hay types/status.ts → client ghi 'Hidden'.
--   'Repairing' không có nghiệp vụ nào đằng sau; BR-002 đúng 4 giá trị → dùng 'Hidden'
--               và đổi nhãn UI thành "Đang ẩn / bảo trì".
-- Xem docs/cp4/02_SCHEMA_DECISIONS.md §3.1
--
-- Idempotent: chạy lại an toàn.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── RENTAL_LISTINGS: vòng đời đầy đủ BR-001 ────────────────────────────────
alter table public.rental_listings drop constraint if exists rental_listings_status_check;
alter table public.rental_listings add constraint rental_listings_status_check
  check (status in ('Draft', 'PendingApproval', 'Active', 'Rejected', 'Hidden', 'Expired', 'Rented'));

alter table public.rental_listings
  add column if not exists rejection_reason text,
  add column if not exists approved_at  timestamptz,
  add column if not exists expire_at    timestamptz,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null,
  add column if not exists moderated_at timestamptz,
  add column if not exists view_count   integer not null default 0;

-- property_id: cột của bảng marketplace trỏ vào bảng workspace.
-- HỢP LỆ vì crossing xảy ra SERVER-SIDE (trong RPC), không phải ở frontend.
-- Cần cho: badge rating (BR-024) và đồng bộ trạng thái khi phòng được thuê (BR-027).
-- Ownership của property_id được validate BÊN TRONG RPC, không bằng constraint.
alter table public.rental_listings
  add column if not exists property_id uuid references public.properties(id) on delete set null;

-- ── DEMAND_POSTS: BR-001 áp dụng cả cho tin nhu cầu ────────────────────────
alter table public.demand_posts drop constraint if exists demand_posts_status_check;
alter table public.demand_posts add constraint demand_posts_status_check
  check (status in ('Draft', 'PendingApproval', 'Active', 'Rejected', 'Hidden', 'Expired'));

alter table public.demand_posts
  add column if not exists rejection_reason text,
  add column if not exists expire_at timestamptz;

-- ── ROOMS: cột description (ghi chú nội bộ) ────────────────────────────────
-- UI "Ghi chú nội bộ" đã ghi vào cột này từ trước nhưng cột chưa tồn tại
-- → mọi lần cập nhật ghi chú phòng đều fail im lặng.
alter table public.rooms
  add column if not exists description text;

-- ── OCCUPANCIES: link_status — CỔNG CHỐNG REVIEW GIAN LẬN (BR-029) ─────────
-- link_status KHÔNG BAO GIỜ được set 'Confirmed' tự động khi chủ trọ gắn tài
-- khoản Renter. Renter phải tự xác nhận. Đây là toàn bộ giá trị chống gian lận
-- của review verified-only (BR-022) — xem can_review_contract() ở migration 0500.
alter table public.occupancies
  add column if not exists link_status text
      check (link_status in ('Pending', 'Confirmed', 'Rejected')),
  add column if not exists end_date date;

-- ── CONTRACTS: bổ sung 'Draft' cho khớp ContractStatus (types/status.ts) ────
alter table public.contracts drop constraint if exists contracts_status_check;
alter table public.contracts add constraint contracts_status_check
  check (status in ('Draft', 'Active', 'Expired', 'Terminated'));

-- ── Dọn dữ liệu bất hợp pháp có thể đã lọt vào trước khi sửa client ────────
update public.rental_listings set status = 'Hidden' where status not in
  ('Draft', 'PendingApproval', 'Active', 'Rejected', 'Hidden', 'Expired', 'Rented');
update public.rooms set status = 'Hidden' where status not in
  ('Available', 'Deposited', 'Rented', 'Hidden');
