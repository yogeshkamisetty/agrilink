-- ========================================================================
-- AgriLink Supabase Auth & Workflow Schema
-- Run this entire file in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- ========================================================================

-- 1. User Profiles (application data linked to auth.users)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  -- Nullable until user completes the onboarding step
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

-- Safe column upgrade if tables were created previously
alter table public.user_profiles alter column role drop not null;
alter table public.user_profiles alter column full_name drop not null;

-- 2. Auth Activity Logs
create table if not exists public.auth_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('login', 'logout', 'signup', 'onboarding_complete')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 3. Large Buyer Purchase Requests (> 50kg review threshold)
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

-- 4. FPO Produce Aggregation Batches
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

-- 5. Produce Aggregation Farmer Contributions
create table if not exists public.aggregation_contributions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.aggregation_batches(id) on delete cascade,
  farmer_id uuid references auth.users(id),
  quantity_kg numeric(10,2) not null check (quantity_kg > 0),
  created_at timestamptz not null default now()
);

-- 6. Enable Row Level Security (RLS)
alter table public.user_profiles enable row level security;
alter table public.auth_activity enable row level security;
alter table public.buyer_purchase_requests enable row level security;
alter table public.aggregation_batches enable row level security;
alter table public.aggregation_contributions enable row level security;

-- 7. RLS Policies for Client Access
drop policy if exists "users read own profile" on public.user_profiles;
create policy "users read own profile" on public.user_profiles for select to authenticated using (id = auth.uid());

drop policy if exists "users update own profile" on public.user_profiles;
create policy "users update own profile" on public.user_profiles for update to authenticated using (id = auth.uid());

drop policy if exists "users insert own profile" on public.user_profiles;
create policy "users insert own profile" on public.user_profiles for insert to authenticated with check (id = auth.uid());

drop policy if exists "buyers read own requests" on public.buyer_purchase_requests;
create policy "buyers read own requests" on public.buyer_purchase_requests for select to authenticated using (buyer_id = auth.uid());

drop policy if exists "authenticated read batches" on public.aggregation_batches;
create policy "authenticated read batches" on public.aggregation_batches for select to authenticated using (true);

drop policy if exists "authenticated read contributions" on public.aggregation_contributions;
create policy "authenticated read contributions" on public.aggregation_contributions for select to authenticated using (true);
