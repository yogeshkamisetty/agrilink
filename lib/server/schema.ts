/**
 * Single source of truth for the database schema. Applied automatically on
 * first use (lib/server/db.ts) and exported to supabase/schema.sql for
 * pasting into the Supabase SQL editor (`pnpm db:export-schema`).
 *
 * Tables live in their own `agrilink` schema: Supabase's PostgREST API only
 * serves `public`, so nothing here is reachable with the public anon key —
 * all reads and writes go through the app's server routes, which enforce
 * the business rules.
 */
export const SCHEMA_VERSION = '5'

export const SCHEMA_SQL = /* sql */ `
create schema if not exists agrilink;

create table if not exists agrilink.meta (
  key text primary key,
  value text not null
);

create table if not exists agrilink.user_accounts (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  full_name text not null,
  role text not null check (role in ('farmer', 'buyer', 'admin')),
  pin_hash text not null,
  salt text not null,
  verification_status text not null default 'verified',
  onboarding_complete boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists user_accounts_phone on agrilink.user_accounts (phone);

create table if not exists agrilink.fpos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  village text not null,
  district text not null,
  state text not null,
  lat double precision not null,
  lng double precision not null,
  bank_account_ref text not null,
  created_at timestamptz not null default now()
);

create table if not exists agrilink.farmers (
  id uuid primary key default gen_random_uuid(),
  fpo_id uuid not null references agrilink.fpos(id),
  name text not null,
  phone text not null,
  language text not null check (language in ('en', 'hi', 'te', 'gu')),
  land_hectares numeric(5, 2) not null check (land_hectares > 0),
  village text not null,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);

create table if not exists agrilink.crop_registry (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references agrilink.farmers(id),
  crop text not null,
  expected_qty_kg numeric(10, 2) not null check (expected_qty_kg > 0),
  harvest_window_start date not null,
  harvest_window_end date not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'CLOSED')),
  created_at timestamptz not null default now(),
  check (harvest_window_end >= harvest_window_start)
);
-- One live registry entry per farmer per crop.
create unique index if not exists crop_registry_one_active on agrilink.crop_registry (farmer_id, crop) where status = 'ACTIVE';

create table if not exists agrilink.buyers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('INSTITUTIONAL', 'FAIR_PRICE_SHOP', 'RESIDENTIAL_SOCIETY')),
  address text not null,
  city text not null,
  lat double precision not null,
  lng double precision not null,
  contact_name text not null,
  contact_phone text not null,
  enrolment integer,
  created_at timestamptz not null default now()
);

create sequence if not exists agrilink.order_code_seq start 1042;
create sequence if not exists agrilink.lot_code_seq start 2042;
create sequence if not exists agrilink.consignment_code_seq start 301;

create table if not exists agrilink.consignments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('CN-' || nextval('agrilink.consignment_code_seq')),
  vehicle_label text not null,
  vehicle_cost numeric(12, 2) not null check (vehicle_cost >= 0),
  route_json jsonb not null,
  dispatched_at timestamptz not null default now()
);

create table if not exists agrilink.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('AG-' || nextval('agrilink.order_code_seq')),
  buyer_id uuid not null references agrilink.buyers(id),
  fpo_id uuid not null references agrilink.fpos(id),
  crop text not null,
  qty_target_kg numeric(10, 2) not null check (qty_target_kg > 0),
  price_per_kg numeric(10, 2) not null check (price_per_kg > 0),
  delivery_date date not null,
  advance_pct numeric(4, 3) not null check (advance_pct >= 0 and advance_pct <= 1),
  status text not null check (status in ('POSTED', 'FUNDED', 'SOURCING', 'AGGREGATED', 'COLLECTING', 'DISPATCHED', 'SETTLED')),
  mandi_ref jsonb,
  retail_ref jsonb,
  advance_amount numeric(12, 2),
  advance_committed_at timestamptz,
  notified_at timestamptz,
  cascade_seconds_per_hour numeric(10, 3),
  simulate_replies boolean not null default false,
  filled_notice_sent_at timestamptz,
  consignment_id uuid references agrilink.consignments(id),
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists agrilink.notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references agrilink.orders(id) on delete cascade,
  farmer_id uuid not null references agrilink.farmers(id),
  channel text not null check (channel in ('SMS', 'WHATSAPP', 'IVR', 'COORDINATOR')),
  tier smallint not null,
  kind text not null check (kind in ('OFFER', 'CONFIRMATION', 'PROMOTED', 'FILLED', 'RELEASED', 'ADVANCE', 'REJECTED', 'SETTLED', 'WITHDRAWN')),
  template text not null,
  params jsonb not null,
  body text not null,
  sent_at timestamptz not null default now(),
  responded_at timestamptz,
  response text check (response in ('ACCEPTED', 'DECLINED')),
  response_qty_kg numeric(10, 2),
  response_source text check (response_source in ('FARMER', 'SIMULATED', 'COORDINATOR')),
  external_ref text
);
-- The cascade is idempotent: each farmer gets at most one offer per channel per order.
create unique index if not exists notifications_offer_once on agrilink.notifications (order_id, farmer_id, channel) where kind = 'OFFER';
create index if not exists notifications_farmer on agrilink.notifications (farmer_id, sent_at desc);

create table if not exists agrilink.commitments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references agrilink.orders(id) on delete cascade,
  farmer_id uuid not null references agrilink.farmers(id),
  registry_id uuid not null references agrilink.crop_registry(id),
  qty_committed_kg numeric(10, 2) not null check (qty_committed_kg > 0),
  is_standby boolean not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'WITHDRAWN', 'FULFILLED', 'REJECTED', 'RELEASED', 'NO_SHOW')),
  promoted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists commitments_order on agrilink.commitments (order_id);

create table if not exists agrilink.lots (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('LOT-' || nextval('agrilink.lot_code_seq')),
  order_id uuid not null references agrilink.orders(id) on delete cascade,
  farmer_id uuid not null references agrilink.farmers(id),
  qty_weighed_kg numeric(10, 2) not null check (qty_weighed_kg > 0),
  qty_accepted_kg numeric(10, 2) not null check (qty_accepted_kg >= 0 and qty_accepted_kg <= qty_weighed_kg),
  ai_status text not null check (ai_status in ('GRADED', 'LOW_CONFIDENCE', 'UNAVAILABLE')),
  ai_grade text check (ai_grade in ('A', 'B', 'C')),
  ai_confidence numeric(4, 3),
  ai_defects jsonb not null default '[]',
  ai_reasoning text,
  ai_model text,
  final_grade text check (final_grade in ('A', 'B', 'C')),
  decision text not null check (decision in ('ACCEPTED', 'OVERRIDDEN', 'MANUAL', 'REJECTED')),
  override_by text,
  override_reason text,
  photo_data_url text,
  captured_at timestamptz not null default now(),
  lat double precision,
  lng double precision,
  transport_share numeric(12, 2),
  buyer_decision text check (buyer_decision in ('ACCEPTED', 'REJECTED')),
  buyer_reason text,
  unique (order_id, farmer_id),
  check ((decision = 'REJECTED') = (qty_accepted_kg = 0)),
  check (decision not in ('OVERRIDDEN', 'REJECTED') or length(coalesce(override_reason, '')) >= 3),
  check (decision = 'REJECTED' or final_grade in ('A', 'B'))
);

-- Every GradeCam photo and the model's verdict, stored server-side so the AI
-- grade recorded on a lot cannot be edited by the client that submits it.
create table if not exists agrilink.grading_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references agrilink.orders(id) on delete cascade,
  farmer_id uuid not null references agrilink.farmers(id),
  ai_status text not null check (ai_status in ('GRADED', 'LOW_CONFIDENCE', 'UNAVAILABLE')),
  ai_grade text check (ai_grade in ('A', 'B', 'C')),
  ai_confidence numeric(4, 3),
  ai_defects jsonb not null default '[]',
  ai_reasoning text,
  ai_model text,
  photo_data_url text,
  lat double precision,
  lng double precision,
  lot_id uuid references agrilink.lots(id),
  created_at timestamptz not null default now()
);

create table if not exists agrilink.advance_records (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references agrilink.orders(id) on delete cascade,
  farmer_id uuid not null references agrilink.farmers(id),
  lot_id uuid not null unique references agrilink.lots(id),
  amount numeric(12, 2) not null check (amount >= 0),
  disbursed_at timestamptz not null default now()
);

create table if not exists agrilink.settlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references agrilink.orders(id) on delete cascade,
  farmer_id uuid not null references agrilink.farmers(id),
  lot_id uuid not null unique references agrilink.lots(id),
  accepted_kg numeric(10, 2) not null,
  price_per_kg numeric(10, 2) not null,
  gross_amount numeric(12, 2) not null,
  transport_share numeric(12, 2) not null,
  advance_deducted numeric(12, 2) not null,
  net_payable numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  check (net_payable = gross_amount - transport_share - advance_deducted)
);

create table if not exists agrilink.price_refs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('MANDI', 'RETAIL')),
  crop text not null,
  market text not null,
  price_date date not null,
  price_per_kg numeric(10, 2) not null check (price_per_kg > 0),
  source text not null,
  tier text not null check (tier in ('live', 'seeded')),
  detail text,
  fetched_at timestamptz not null default now()
);
create index if not exists price_refs_lookup on agrilink.price_refs (kind, crop, tier, fetched_at desc);

create table if not exists agrilink.order_history (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references agrilink.buyers(id) on delete cascade,
  crop text not null,
  week_start date not null,
  school_days smallint not null,
  qty_kg numeric(10, 2) not null,
  synthetic boolean not null default true,
  unique (buyer_id, crop, week_start)
);

create table if not exists agrilink.academic_calendar (
  day date primary key,
  kind text not null check (kind in ('HOLIDAY', 'EXAM')),
  label text not null,
  synthetic boolean not null default true
);

-- Member sales that went outside AgriLink (trader or mandi), logged by the
-- coordinator. The denominator of the volume-shift metric.
create table if not exists agrilink.channel_sales_log (
  id uuid primary key default gen_random_uuid(),
  fpo_id uuid not null references agrilink.fpos(id),
  farmer_id uuid references agrilink.farmers(id),
  crop text not null,
  qty_kg numeric(10, 2) not null check (qty_kg > 0),
  channel text not null check (channel in ('TRADER', 'MANDI')),
  sold_on date not null,
  note text,
  synthetic boolean not null default false,
  created_at timestamptz not null default now()
);

-- Demo only: how each seeded farmer "replies" when simulated replies are on.
create table if not exists agrilink.demo_reply_profiles (
  farmer_id uuid primary key references agrilink.farmers(id) on delete cascade,
  reply_after_hours numeric(6, 2) not null,
  response text not null check (response in ('ACCEPT', 'DECLINE', 'NONE')),
  qty_kg numeric(10, 2)
);

create table if not exists agrilink.aggregation_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null,
  fpo_name text not null,
  crop text not null,
  location text not null,
  total_quantity_kg numeric not null,
  grade_a_kg numeric default 0,
  grade_b_kg numeric default 0,
  quality_verified boolean default false,
  created_by text,
  created_at timestamptz default now()
);

alter table agrilink.fpos enable row level security;
alter table agrilink.aggregation_batches enable row level security;
alter table agrilink.farmers enable row level security;
alter table agrilink.crop_registry enable row level security;
alter table agrilink.buyers enable row level security;
alter table agrilink.consignments enable row level security;
alter table agrilink.orders enable row level security;
alter table agrilink.notifications enable row level security;
alter table agrilink.commitments enable row level security;
alter table agrilink.lots enable row level security;
alter table agrilink.grading_attempts enable row level security;
alter table agrilink.advance_records enable row level security;
alter table agrilink.settlements enable row level security;
alter table agrilink.price_refs enable row level security;
alter table agrilink.order_history enable row level security;
alter table agrilink.academic_calendar enable row level security;
alter table agrilink.channel_sales_log enable row level security;
alter table agrilink.demo_reply_profiles enable row level security;
`
