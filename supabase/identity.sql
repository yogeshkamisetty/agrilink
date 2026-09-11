create table if not exists public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('farmer','buyer')),
  subject_id uuid not null,
  aadhaar_last4 text not null check (aadhaar_last4 ~ '^[0-9]{4}$'),
  status text not null default 'otp_pending' check (status in ('otp_pending','verified','expired','rejected')),
  consent_at timestamptz not null,
  otp_sent_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(subject_type, subject_id)
);

alter table public.identity_verifications enable row level security;
drop policy if exists "identity authenticated access" on public.identity_verifications;
create policy "identity authenticated access" on public.identity_verifications for all to authenticated using (true) with check (true);
create index if not exists identity_subject_idx on public.identity_verifications(subject_type, subject_id);
