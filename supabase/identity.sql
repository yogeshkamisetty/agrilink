-- Identity assurance only: this schema never authenticates against UIDAI.
create table if not exists public.identity_verifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  user_type text not null check (user_type in ('farmer','buyer')),
  -- A keyed, non-reversible digest; never a readable Aadhaar value.
  aadhaar_number text not null, aadhaar_last4 text not null check (aadhaar_last4 ~ '^[0-9]{4}$'),
  aadhaar_consent boolean not null default false, mobile_number text not null check (mobile_number ~ '^[0-9]{10}$'),
  mobile_verified boolean not null default false, aadhaar_document_url text,
  aadhaar_format_valid boolean not null default false, verhoeff_valid boolean not null default false,
  ocr_name text, ocr_aadhaar text, identity_confidence integer check (identity_confidence between 0 and 100),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, user_type)
);
create table if not exists public.identity_otp_challenges (
  id uuid primary key default gen_random_uuid(), verification_id uuid not null references public.identity_verifications(id) on delete cascade,
  otp_hash text not null, expires_at timestamptz not null, attempts integer not null default 0 check (attempts between 0 and 5),
  consumed_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists identity_verifications_user_idx on public.identity_verifications(user_id, user_type);
create index if not exists identity_otp_lookup_idx on public.identity_otp_challenges(verification_id, created_at desc);
alter table public.identity_verifications enable row level security;
alter table public.identity_otp_challenges enable row level security;
-- Sensitive records are accessed only by server routes using the service role.
-- Create a private Storage bucket named identity-documents in the Supabase dashboard.
-- Set IDENTITY_OTP_WEBHOOK_URL to your SMS-provider server endpoint in production.
