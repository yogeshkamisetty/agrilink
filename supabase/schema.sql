create extension if not exists pgcrypto;

create table if not exists public.farmers (
  id uuid primary key default gen_random_uuid(), name text not null, village text not null,
  mobile_number text not null, crop_name text not null, quantity numeric not null check (quantity >= 0),
  quality_grade text, harvest_date date, verified boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.buyers (
  id uuid primary key default gen_random_uuid(), buyer_name text not null, organization_name text not null,
  mobile_number text not null, created_at timestamptz not null default now()
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(), buyer_id uuid not null references public.buyers(id) on delete restrict,
  crop_required text not null, quantity_required numeric not null check (quantity_required > 0), grade_required text,
  delivery_date date not null, delivery_location text not null, status text not null default 'open', created_at timestamptz not null default now()
);
create table if not exists public.commitments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  farmer_id uuid not null references public.farmers(id) on delete restrict, quantity_committed numeric not null check (quantity_committed > 0),
  commitment_status text not null default 'pending', created_at timestamptz not null default now()
);

alter table public.farmers add column if not exists verified boolean not null default false;
alter table public.orders add column if not exists grade_required text;
alter table public.commitments add column if not exists commitment_status text not null default 'pending';

alter table public.farmers enable row level security;
alter table public.buyers enable row level security;
alter table public.orders enable row level security;
alter table public.commitments enable row level security;

drop policy if exists "authenticated farmers access" on public.farmers;
drop policy if exists "authenticated buyers access" on public.buyers;
drop policy if exists "authenticated orders access" on public.orders;
drop policy if exists "authenticated commitments access" on public.commitments;
create policy "authenticated farmers access" on public.farmers for all to authenticated using (true) with check (true);
create policy "authenticated buyers access" on public.buyers for all to authenticated using (true) with check (true);
create policy "authenticated orders access" on public.orders for all to authenticated using (true) with check (true);
create policy "authenticated commitments access" on public.commitments for all to authenticated using (true) with check (true);
