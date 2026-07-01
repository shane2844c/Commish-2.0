create table if not exists public.consultant_month_metrics (
  id uuid primary key default gen_random_uuid(),
  consultant_month_id uuid references public.consultant_months(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  month int not null,
  year int not null,
  mtd_target_conversion numeric not null default 0,
  mtd_conversion_rate numeric not null default 0,
  percent_to_target_conversion numeric not null default 0,
  mtd_conversion_multiplier numeric not null default 0,
  mtd_total_sales_points numeric not null default 0,
  points_target numeric not null default 0,
  average_gwp numeric not null default 0,
  mtd_dpp numeric not null default 0,
  gwp_accelerator_per_point numeric not null default 0,
  mtd_commission numeric not null default 0,
  projected_total_sales_points numeric not null default 0,
  projected_dpp numeric not null default 0,
  projected_gwp_payable_per_point numeric not null default 0,
  projected_conversion_multiplier numeric not null default 0,
  projected_commission numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_id, month, year)
);

alter table public.consultant_month_metrics enable row level security;

create policy "Consultant month metrics are readable by authenticated users"
  on public.consultant_month_metrics for select using (true);

create policy "Users can upsert their own consultant month metrics"
  on public.consultant_month_metrics for insert with check (auth.uid() = user_id);

create policy "Users can update their own consultant month metrics"
  on public.consultant_month_metrics for update using (auth.uid() = user_id);

create policy "Users can delete their own consultant month metrics"
  on public.consultant_month_metrics for delete using (auth.uid() = user_id);

alter table public.profiles
  add column if not exists display_name text;
