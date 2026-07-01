create table if not exists public.compliance_call_scores (
  id uuid primary key default gen_random_uuid(),
  consultant_month_id uuid references public.consultant_months(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  call_number int not null check (call_number between 1 and 5),
  score numeric not null check (score >= 0 and score <= 100),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(consultant_month_id, call_number)
);

alter table public.consultant_month_metrics
  add column if not exists qa_calls_marked numeric not null default 0,
  add column if not exists qa_average numeric not null default 0,
  add column if not exists qa_complete boolean not null default false,
  add column if not exists qa_passed boolean not null default false,
  add column if not exists qa_failed boolean not null default false,
  add column if not exists compliance_payable_rate numeric not null default 1,
  add column if not exists current_fail_streak numeric not null default 0,
  add column if not exists commission_ineligible boolean not null default false,
  add column if not exists compliance_adjusted_mtd_commission numeric not null default 0,
  add column if not exists compliance_adjusted_projected_commission numeric not null default 0;

alter table public.compliance_call_scores enable row level security;

create policy "Compliance call scores are readable by authenticated users"
  on public.compliance_call_scores for select using (true);

create policy "Users can modify their own compliance call scores"
  on public.compliance_call_scores for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
