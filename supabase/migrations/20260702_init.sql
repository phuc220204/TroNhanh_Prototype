-- 1. Kích hoạt extension cần thiết
create extension if not exists "uuid-ossp";

-- 2. Hàm trigger tự động cập nhật updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 3. Tạo bảng PROFILES (đồng bộ với auth.users)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  full_name text,
  contact_phone text,
  is_seller boolean default false,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- 4. Tạo bảng SUBSCRIPTION_PLANS
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_months integer not null,
  price numeric not null,
  renewal_price numeric not null,
  max_properties integer not null,
  max_rooms integer not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- 5. Tạo bảng USER_SUBSCRIPTIONS (gói dịch vụ của seller)
create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id) on delete cascade not null,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  start_date date not null,
  expire_date date not null,
  status text not null check (status in ('NONE', 'TRIAL', 'ACTIVE', 'READ_ONLY')),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- 6. Tạo bảng PROPERTIES (Khu trọ)
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  address text,
  district text,
  floor_count integer,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  electricity_unit_price numeric default 0 not null,
  water_unit_price numeric default 0 not null,
  service_fee numeric default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone
);

-- 7. Tạo bảng ROOMS (Phòng trong khu trọ)
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade not null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  room_code text not null,
  floor integer,
  area numeric not null,
  price numeric not null,
  status text not null check (status in ('Available', 'Deposited', 'Rented', 'Hidden')),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  unique(property_id, room_code)
);

-- 8. Tạo bảng OCCUPANCIES (Người ở)
create table public.occupancies (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete set null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  phone_number text,
  start_date date,
  occupant_count integer default 1,
  is_active boolean default true,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone
);

-- 9. Tạo bảng CONTRACTS (Hợp đồng)
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  occupancy_id uuid references public.occupancies(id) on delete cascade not null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  rent_price numeric not null,
  deposit numeric not null,
  status text not null check (status in ('Active', 'Expired', 'Terminated')),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone
);

-- 10. Tạo bảng UTILITY_READINGS (Chỉ số điện nước)
create table public.utility_readings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('Electricity', 'Water')),
  period text not null, -- Định dạng YYYY-MM
  previous_reading numeric not null,
  current_reading numeric not null,
  unit_price numeric not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone,
  check (current_reading >= previous_reading)
);

-- 11. Tạo bảng INVOICES (Hóa đơn)
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  contract_id uuid references public.contracts(id) on delete set null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  period text not null, -- Định dạng YYYY-MM
  due_date date not null,
  total_amount numeric not null,
  status text not null check (status in ('Unpaid', 'PartiallyPaid', 'Paid', 'Overdue')),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone
);

-- 12. Tạo bảng INVOICE_ITEMS (Chi tiết hóa đơn)
create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade not null,
  type text not null check (type in ('Rent', 'Electricity', 'Water', 'Service', 'Other')),
  description text,
  quantity numeric default 1 not null,
  unit_price numeric not null,
  amount numeric not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- 13. Tạo bảng PAYMENTS (Ghi nhận thu tiền)
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete set null,
  user_subscription_id uuid references public.user_subscriptions(id) on delete set null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  amount numeric not null,
  method text not null check (method in ('Cash', 'BankTransfer')),
  paid_at timestamp with time zone default now() not null,
  purpose text not null check (purpose in ('RentInvoice', 'Boost', 'Subscription')),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- 14. Tạo bảng RENTAL_LISTINGS (Tin cho thuê)
create table public.rental_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete set null,
  title text not null,
  property_type text not null,
  price numeric not null,
  district text not null,
  area numeric not null,
  status text not null check (status in ('Active', 'PendingApproval', 'Hidden', 'Expired')),
  boost_expire_at timestamp with time zone,
  contact_phone text,
  contact_name text,
  address text,
  description text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone
);

-- 15. Tạo bảng LISTING_AMENITIES (Tiện ích tin đăng)
create table public.listing_amenities (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.rental_listings(id) on delete cascade not null,
  amenity text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- 16. Tạo bảng DEMAND_POSTS (Tin đăng nhu cầu)
create table public.demand_posts (
  id uuid primary key default gen_random_uuid(),
  renter_id uuid references auth.users(id) on delete cascade not null,
  kind text not null check (kind in ('RoomWanted', 'RoommateWanted')),
  desired_districts text[] not null,
  price_min numeric not null,
  price_max numeric not null,
  status text not null check (status in ('Active', 'Hidden', 'Expired')),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  deleted_at timestamp with time zone
);

-- 17. CÀI ĐẶT TRIGGERS CHO CỘT updated_at
create trigger update_profiles_modtime before update on public.profiles for each row execute procedure public.update_updated_at_column();
create trigger update_subscription_plans_modtime before update on public.subscription_plans for each row execute procedure public.update_updated_at_column();
create trigger update_user_subscriptions_modtime before update on public.user_subscriptions for each row execute procedure public.update_updated_at_column();
create trigger update_properties_modtime before update on public.properties for each row execute procedure public.update_updated_at_column();
create trigger update_rooms_modtime before update on public.rooms for each row execute procedure public.update_updated_at_column();
create trigger update_occupancies_modtime before update on public.occupancies for each row execute procedure public.update_updated_at_column();
create trigger update_contracts_modtime before update on public.contracts for each row execute procedure public.update_updated_at_column();
create trigger update_utility_readings_modtime before update on public.utility_readings for each row execute procedure public.update_updated_at_column();
create trigger update_invoices_modtime before update on public.invoices for each row execute procedure public.update_updated_at_column();
create trigger update_invoice_items_modtime before update on public.invoice_items for each row execute procedure public.update_updated_at_column();
create trigger update_payments_modtime before update on public.payments for each row execute procedure public.update_updated_at_column();
create trigger update_rental_listings_modtime before update on public.rental_listings for each row execute procedure public.update_updated_at_column();
create trigger update_listing_amenities_modtime before update on public.listing_amenities for each row execute procedure public.update_updated_at_column();
create trigger update_demand_posts_modtime before update on public.demand_posts for each row execute procedure public.update_updated_at_column();

-- 18. TỰ ĐỘNG TẠO PROFILE KHI ĐĂNG KÝ USER
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, full_name, contact_phone, is_seller)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'contact_phone', ''),
    false
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 19. THIẾT LẬP ROW-LEVEL SECURITY (RLS)

-- Bật RLS
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.rooms enable row level security;
alter table public.occupancies enable row level security;
alter table public.contracts enable row level security;
alter table public.utility_readings enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.rental_listings enable row level security;
alter table public.listing_amenities enable row level security;
alter table public.demand_posts enable row level security;

-- RLS Policies cho Profiles (Cá nhân tự sửa thông tin mình)
create policy "User can view own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "User can update own profile" on public.profiles for update using (auth.uid() = user_id);

-- RLS Policies cho các bảng SaaS (Chỉ chủ sở hữu được truy cập)
create policy "Owner properties access" on public.properties for all using (auth.uid() = owner_id);
create policy "Owner rooms access" on public.rooms for all using (auth.uid() = owner_id);
create policy "Owner occupancies access" on public.occupancies for all using (auth.uid() = owner_id);
create policy "Owner contracts access" on public.contracts for all using (auth.uid() = owner_id);
create policy "Owner utility readings access" on public.utility_readings for all using (auth.uid() = owner_id);
create policy "Owner invoices access" on public.invoices for all using (auth.uid() = owner_id);
create policy "Owner payments access" on public.payments for all using (auth.uid() = owner_id);
create policy "Owner subscriptions access" on public.user_subscriptions for all using (auth.uid() = seller_id);

-- RLS Policies cho Invoice Items (truy cập gián tiếp qua hóa đơn)
create policy "Owner invoice items access" on public.invoice_items for all using (
  exists (
    select 1 from public.invoices
    where public.invoices.id = invoice_id and public.invoices.owner_id = auth.uid()
  )
);

-- RLS Policies cho Marketplace (Đọc công khai tin Active, ghi sửa bởi Owner)
create policy "Public view active listings" on public.rental_listings for select using (status = 'Active');
create policy "Seller manage listings" on public.rental_listings for all using (auth.uid() = seller_id);

create policy "Public view amenities" on public.listing_amenities for select using (
  exists (
    select 1 from public.rental_listings
    where public.rental_listings.id = listing_id and public.rental_listings.status = 'Active'
  )
);
create policy "Seller manage amenities" on public.listing_amenities for all using (
  exists (
    select 1 from public.rental_listings
    where public.rental_listings.id = listing_id and public.rental_listings.seller_id = auth.uid()
  )
);

create policy "Public view active demand posts" on public.demand_posts for select using (status = 'Active');
create policy "Renter manage demand posts" on public.demand_posts for all using (auth.uid() = renter_id);

-- 20. SEED DỮ LIỆU BAN ĐẦU CHO PLANS
insert into public.subscription_plans (name, duration_months, price, renewal_price, max_properties, max_rooms)
values 
('Gói Dùng thử', 1, 0, 0, 1, 5),
('Gói Phổ thông', 12, 1200000, 1000000, 5, 50),
('Gói Chuyên nghiệp', 36, 3000000, 2500000, 99, 999);
