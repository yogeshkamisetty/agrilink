-- Run after enabling Supabase Auth. Application roles live separately from auth.users.
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('farmer', 'buyer', 'admin')),
  full_name text not null,
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
create table if not exists public.auth_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('login', 'logout', 'signup', 'onboarding_complete')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
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
alter table public.user_profiles enable row level security;
alter table public.auth_activity enable row level security;
alter table public.buyer_purchase_requests enable row level security;
alter table public.aggregation_batches enable row level security;
alter table public.aggregation_contributions enable row level security;
-- Server routes use the service role. Add role-specific RLS policies before exposing direct client writes.
