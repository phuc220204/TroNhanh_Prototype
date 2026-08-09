-- ═══════════════════════════════════════════════════════════════════════════
-- 0700 — MESSAGING (BR-019, BR-030)
--
-- Nút "Nhắn tin" hiện có ở CẢ chi tiết tin (RoomDetailPage.tsx:746) VÀ card
-- demand post, nhưng chỉ trả lời canned auto-reply → mọi luồng liên hệ đều cụt.
--
-- MỘT inbox duy nhất ở /tin-nhan: Seller và Renter là CÙNG MỘT account
-- (role additive, spec §1.8). Hai inbox sẽ xé một thread thành 2 URL.
--
-- Xem docs/cp4/02_SCHEMA_DECISIONS.md §9
-- Idempotent: chạy lại an toàn.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.conversations (
  id       uuid primary key default gen_random_uuid(),
  ref_type text not null check (ref_type in ('RentalListing', 'DemandPost')),
  ref_id   uuid not null,
  -- poster_id LUÔN derive server-side trong start_conversation().
  -- Nhận từ client sẽ cho phép bất kỳ ai mở thread "TỪ" người khác.
  initiator_id uuid references auth.users(id) on delete cascade not null,
  poster_id    uuid references auth.users(id) on delete cascade not null,
  status text not null default 'Active' check (status in ('Active', 'Archived', 'Blocked')),
  last_message_at      timestamptz default now() not null,
  last_message_preview text,
  initiator_unread integer not null default 0,
  poster_unread    integer not null default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint no_self_contact check (initiator_id <> poster_id),   -- BR-030
  unique (initiator_id, ref_type, ref_id)                         -- BR-019
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id       uuid references auth.users(id) on delete cascade not null,
  content         text not null check (char_length(content) between 1 and 2000),
  is_read         boolean not null default false,
  read_at         timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_messages_conv   on public.messages (conversation_id, created_at);
create index if not exists idx_conv_poster     on public.conversations (poster_id, last_message_at desc);
create index if not exists idx_conv_initiator  on public.conversations (initiator_id, last_message_at desc);
create index if not exists idx_conv_ref        on public.conversations (ref_type, ref_id);

alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

drop trigger if exists update_conversations_modtime on public.conversations;
create trigger update_conversations_modtime before update on public.conversations
  for each row execute procedure public.update_updated_at_column();
drop trigger if exists update_messages_modtime on public.messages;
create trigger update_messages_modtime before update on public.messages
  for each row execute procedure public.update_updated_at_column();

-- ══ RLS ═══════════════════════════════════════════════════════════════════
-- ĐÂY LÀ CHỖ DUY NHẤT trong CP4 mà `exists` lồng là ỔN, vì CẢ HAI participant
-- đều SELECT được row conversation bằng RLS của chính họ (policy ngay dưới).
-- Mọi chỗ khác phải bọc security definer — xem luật ở migration 0400.
drop policy if exists "Participants read conv"   on public.conversations;
drop policy if exists "Participants update conv" on public.conversations;
drop policy if exists "Participants read msgs"   on public.messages;
drop policy if exists "Participants send msgs"   on public.messages;
drop policy if exists "Sender marks read"        on public.messages;

create policy "Participants read conv" on public.conversations
  for select using (auth.uid() in (initiator_id, poster_id));

create policy "Participants update conv" on public.conversations
  for update using (auth.uid() in (initiator_id, poster_id));
-- INSERT chỉ qua start_conversation() RPC — poster_id phải derive server-side.

create policy "Participants read msgs" on public.messages
  for select using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.initiator_id, c.poster_id)
  ));

create policy "Participants send msgs" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid() and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.initiator_id, c.poster_id)
        and c.status = 'Active'
    )
  );

create policy "Sender marks read" on public.messages
  for update using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.initiator_id, c.poster_id)
  ));

-- ══ TRIGGER: cập nhật preview + unread counter ĐÚNG PHÍA ══════════════════
create or replace function public.bump_conversation_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_initiator uuid; v_poster uuid;
begin
  select initiator_id, poster_id into v_initiator, v_poster
  from public.conversations where id = new.conversation_id;

  update public.conversations set
    last_message_at      = new.created_at,
    last_message_preview = left(new.content, 120),
    -- người GỬI không tự tăng unread của mình
    initiator_unread = initiator_unread + case when new.sender_id = v_poster    then 1 else 0 end,
    poster_unread    = poster_unread    + case when new.sender_id = v_initiator then 1 else 0 end
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists messages_bump_conversation on public.messages;
create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute procedure public.bump_conversation_on_message();

-- ══ REALTIME ══════════════════════════════════════════════════════════════
-- Dùng Realtime, KHÔNG polling: một dòng SQL + một .channel() subscribe, so với
-- một timer phải teardown ở 3 chỗ. Client vẫn giữ refetchInterval 15s sau cờ
-- USE_REALTIME_MESSAGING làm fallback cho mạng hội trường chặn websocket.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;   -- đã add rồi
  when undefined_object then null;   -- publication chưa tồn tại (local/self-host)
end $$;
