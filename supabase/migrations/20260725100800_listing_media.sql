-- ═══════════════════════════════════════════════════════════════════════════
-- 0800 — LISTING MEDIA + SUPABASE STORAGE
--
-- Repo hiện có ZERO lời gọi `storage.`. Ảnh tin đăng là URL Unsplash băm từ
-- UUID của listing (getListingImage, AllListingsPage.tsx:86-93) → luồng "đăng
-- tin cho thuê" KHÔNG THỂ test thật.
--
-- DEVIATION so với spec 02 (cố ý, xem 02_SCHEMA_DECISIONS.md §12):
--   listing_media(listing_id) thay vì Media(owner_type, owner_id) polymorphic.
--   Ownership polymorphic không RLS được mà không cần CASE qua 6 bảng owner
--   (+ 1 definer helper mỗi nhánh); scoped theo listing thì policy 3 dòng.
--
-- Idempotent: chạy lại an toàn.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.listing_media (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid references public.rental_listings(id) on delete cascade not null,
  -- LƯU storage_path, KHÔNG BAO GIỜ LƯU URL.
  -- Derive bằng supabase.storage.from('listing-images').getPublicUrl(path) lúc
  -- render, để đổi bucket/CDN không thành một cuộc migration dữ liệu.
  -- Định dạng: '{seller_id}/{listing_id}/{uuid}.webp'
  storage_path text not null,
  sort_order   integer not null default 0,
  width        integer,
  height       integer,
  size_bytes   integer,
  mime_type    text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (listing_id, sort_order)
);
create index if not exists idx_media_listing on public.listing_media (listing_id, sort_order);

alter table public.listing_media enable row level security;

drop trigger if exists update_listing_media_modtime on public.listing_media;
create trigger update_listing_media_modtime before update on public.listing_media
  for each row execute procedure public.update_updated_at_column();

-- ══ RLS ═══════════════════════════════════════════════════════════════════
-- `exists` inline ở đây ỔN: rental_listings có policy SELECT public cho
-- status='Active', nên anon đọc được row đó bằng RLS của chính mình.
drop policy if exists "Public reads media of visible listings" on public.listing_media;
drop policy if exists "Seller manages own media"               on public.listing_media;

create policy "Public reads media of visible listings" on public.listing_media
  for select using (exists (
    select 1 from public.rental_listings l
    where l.id = listing_id
      and l.status in ('Active', 'Rented')
      and l.deleted_at is null
  ));

create policy "Seller manages own media" on public.listing_media
  for all using (exists (
    select 1 from public.rental_listings l
    where l.id = listing_id and l.seller_id = auth.uid()
  ));

-- ══ BUCKET ════════════════════════════════════════════════════════════════
-- PUBLIC READ: ảnh marketplace vốn công khai. Bucket private nghĩa là signed URL
-- trên MỌI card và một vấn đề hết hạn 60s ngay giữa buổi demo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- ══ STORAGE POLICIES ══════════════════════════════════════════════════════
-- ⚠️ seller_id PHẢI là segment ĐẦU của path — đó là thứ DUY NHẤT khiến các
-- policy dưới đây viết được. Nếu đổi thứ tự path thành {listing_id}/{seller_id}/...
-- thì không còn cách nào chặn user A upload vào thư mục của user B.
drop policy if exists "Public read listing images"   on storage.objects;
drop policy if exists "Owner uploads to own folder"  on storage.objects;
drop policy if exists "Owner updates own folder"     on storage.objects;
drop policy if exists "Owner deletes own folder"     on storage.objects;

create policy "Public read listing images" on storage.objects
  for select using (bucket_id = 'listing-images');

create policy "Owner uploads to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Owner updates own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Owner deletes own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- LƯU Ý CHO T19:
--   Resize ở CLIENT trước khi upload (canvas → toBlob('image/webp', 0.82),
--   cạnh dài max 1600px) trong media-service.ts. Không cần edge function.
--
--   Ràng buộc "≥3 ảnh" CHỈ đặt ở form (Yup đã có sẵn ở DangTinPage.tsx:522),
--   KHÔNG đặt trong RPC — nếu không seeder và mọi row cũ sẽ vỡ.
