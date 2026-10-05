-- Nhật ký thu hóa đơn: mỗi lần chủ trọ đi thu mà chưa thu được thì ghi một dòng
-- (lý do + ngày hẹn thu lại). Sửa/xóa được từng dòng. Chỉ chủ trọ thấy —
-- Renter đọc được hóa đơn của mình nhưng KHÔNG đọc được nhật ký này.
--
-- Ghi một bảng duy nhất ⇒ không cần RPC (tiền lệ `saved_listings`):
-- `owner_id` lấy từ `default auth.uid()` và bị `with check` chốt lại, client
-- không tự gán được chủ khác.
--
-- Inline `exists` trên `invoices` trong policy là hợp lệ theo ngoại lệ §3.1:
-- chủ trọ SELECT được hóa đơn của chính mình qua RLS ("Owner reads invoices"),
-- giống policy hiện có của `invoice_items`.

create table if not exists public.invoice_collection_notes (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  follow_up_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoice_collection_notes_invoice
  on public.invoice_collection_notes (invoice_id, created_at desc);
create index if not exists idx_invoice_collection_notes_owner
  on public.invoice_collection_notes (owner_id);

alter table public.invoice_collection_notes enable row level security;

drop policy if exists "Owner reads collection notes" on public.invoice_collection_notes;
drop policy if exists "Owner inserts collection notes" on public.invoice_collection_notes;
drop policy if exists "Owner updates collection notes" on public.invoice_collection_notes;
drop policy if exists "Owner deletes collection notes" on public.invoice_collection_notes;

create policy "Owner reads collection notes" on public.invoice_collection_notes
  for select to authenticated using (owner_id = auth.uid());

create policy "Owner inserts collection notes" on public.invoice_collection_notes
  for insert to authenticated with check (
    owner_id = auth.uid()
    and public.can_write_saas()
    and exists (select 1 from public.invoices i
                 where i.id = invoice_collection_notes.invoice_id
                   and i.owner_id = auth.uid()
                   and i.deleted_at is null)
  );

create policy "Owner updates collection notes" on public.invoice_collection_notes
  for update to authenticated using (
    owner_id = auth.uid() and public.can_write_saas()
  ) with check (
    owner_id = auth.uid()
    and public.can_write_saas()
    and exists (select 1 from public.invoices i
                 where i.id = invoice_collection_notes.invoice_id
                   and i.owner_id = auth.uid()
                   and i.deleted_at is null)
  );

create policy "Owner deletes collection notes" on public.invoice_collection_notes
  for delete to authenticated using (owner_id = auth.uid() and public.can_write_saas());

drop trigger if exists update_invoice_collection_notes_modtime on public.invoice_collection_notes;
create trigger update_invoice_collection_notes_modtime
  before update on public.invoice_collection_notes
  for each row execute procedure public.update_updated_at_column();

-- BR-015: hết gói ⇒ READ_ONLY, chặn cả ở tầng trigger (giống các bảng SaaS khác).
drop trigger if exists guard_saas_write_invoice_collection_notes on public.invoice_collection_notes;
create trigger guard_saas_write_invoice_collection_notes
  before insert or update or delete on public.invoice_collection_notes
  for each row execute function public.guard_saas_workspace_write();
