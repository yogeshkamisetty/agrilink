-- ============================================================================
-- AgriLink Unified Database Setup Script
-- Copy and run this ENTIRE script in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Core Marketplace: Farmers, Buyers, Orders, Commitments
create table if not exists public.farmers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  village text not null,
  mobile_number text not null,
  crop_name text not null,
  quantity numeric not null check (quantity >= 0),
  quality_grade text,
  harvest_date date,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.buyers (
  id uuid primary key default gen_random_uuid(),
  buyer_name text not null,
  organization_name text not null,
  mobile_number text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers(id) on delete restrict,
  crop_required text not null,
  quantity_required numeric not null check (quantity_required > 0),
  grade_required text,
  delivery_date date not null,
  delivery_location text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.commitments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  farmer_id uuid not null references public.farmers(id) on delete restrict,
  quantity_committed numeric not null check (quantity_committed > 0),
  commitment_status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- 2. User Profiles & Roles (linked to Supabase Auth)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('farmer', 'buyer', 'admin')),
  full_name text,
  mobile_number text,
  village text,
  district text,
  state text,
  fpo_name text,
  organization_name text,
  organization_type text,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  onboarding_complete boolean not null default false,
  last_login_at timestamptz,
  last_logout_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles alter column role drop not null;
alter table public.user_profiles alter column full_name drop not null;

-- 3. Audit Logging (Login, Logout, Signup, Onboarding)
create table if not exists public.auth_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('login', 'logout', 'signup', 'onboarding_complete')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 4. Buyer Purchase Requests & Large Order Admin Review (>50 kg)
create table if not exists public.buyer_purchase_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  crop text not null,
  quantity_kg numeric(10,2) not null check (quantity_kg > 0),
  purpose text,
  review_required boolean not null default false,
  review_status text not null default 'not_required' check (review_status in ('not_required', 'pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 5. FPO Aggregation Batches & Farmer Contributions
create table if not exists public.aggregation_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  fpo_name text not null,
  crop text not null,
  location text not null,
  total_quantity_kg numeric(10,2) not null default 0,
  grade_a_kg numeric(10,2) not null default 0,
  grade_b_kg numeric(10,2) not null default 0,
  quality_verified boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.aggregation_contributions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.aggregation_batches(id) on delete cascade,
  farmer_id uuid references auth.users(id),
  quantity_kg numeric(10,2) not null check (quantity_kg > 0),
  created_at timestamptz not null default now()
);

-- 6. Identity & Aadhaar Verification Assurance
create table if not exists public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_type text not null check (user_type in ('farmer','buyer')),
  aadhaar_number text not null,
  aadhaar_last4 text not null check (aadhaar_last4 ~ '^[0-9]{4}$'),
  aadhaar_consent boolean not null default false,
  mobile_number text not null check (mobile_number ~ '^[0-9]{10}$'),
  mobile_verified boolean not null default false,
  aadhaar_document_url text,
  aadhaar_format_valid boolean not null default false,
  verhoeff_valid boolean not null default false,
  ocr_name text,
  ocr_aadhaar text,
  identity_confidence integer check (identity_confidence between 0 and 100),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, user_type)
);

create table if not exists public.identity_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.identity_verifications(id) on delete cascade,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists identity_verifications_user_idx on public.identity_verifications(user_id, user_type);
create index if not exists identity_otp_lookup_idx on public.identity_otp_challenges(verification_id, created_at desc);

-- 7. Row Level Security (RLS) Configuration
alter table public.farmers enable row level security;
alter table public.buyers enable row level security;
alter table public.orders enable row level security;
alter table public.commitments enable row level security;
alter table public.user_profiles enable row level security;
alter table public.auth_activity enable row level security;
alter table public.buyer_purchase_requests enable row level security;
alter table public.aggregation_batches enable row level security;
alter table public.aggregation_contributions enable row level security;
alter table public.identity_verifications enable row level security;
alter table public.identity_otp_challenges enable row level security;

-- Marketplace Policies
drop policy if exists "authenticated farmers access" on public.farmers;
create policy "authenticated farmers access" on public.farmers for all to authenticated using (true) with check (true);

drop policy if exists "authenticated buyers access" on public.buyers;
create policy "authenticated buyers access" on public.buyers for all to authenticated using (true) with check (true);

drop policy if exists "authenticated orders access" on public.orders;
create policy "authenticated orders access" on public.orders for all to authenticated using (true) with check (true);

drop policy if exists "authenticated commitments access" on public.commitments;
create policy "authenticated commitments access" on public.commitments for all to authenticated using (true) with check (true);

-- User Profiles Policies
drop policy if exists "users read own profile" on public.user_profiles;
create policy "users read own profile" on public.user_profiles for select to authenticated using (id = auth.uid());

drop policy if exists "users update own profile" on public.user_profiles;
create policy "users update own profile" on public.user_profiles for update to authenticated using (id = auth.uid());

drop policy if exists "users insert own profile" on public.user_profiles;
create policy "users insert own profile" on public.user_profiles for insert to authenticated with check (id = auth.uid());

-- Buyer & Aggregation Policies
drop policy if exists "buyers read own requests" on public.buyer_purchase_requests;
create policy "buyers read own requests" on public.buyer_purchase_requests for select to authenticated using (buyer_id = auth.uid());

drop policy if exists "authenticated read batches" on public.aggregation_batches;
create policy "authenticated read batches" on public.aggregation_batches for select to authenticated using (true);

drop policy if exists "authenticated read contributions" on public.aggregation_contributions;
create policy "authenticated read contributions" on public.aggregation_contributions for select to authenticated using (true);

-- Storage: Ensure 'identity-documents' bucket exists for Aadhaar upload
insert into storage.buckets (id, name, public)
values ('identity-documents', 'identity-documents', false)
on conflict (id) do nothing;
