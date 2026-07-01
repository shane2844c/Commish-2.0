create table if not exists public.consultant_rostered_days_off (
  id uuid primary key default gen_random_uuid(),
  consultant_month_id uuid references public.consultant_months(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  off_date date not null,
  reason text,
  created_at timestamptz default now(),
  unique(consultant_month_id, off_date)
);

alter table public.consultant_rostered_days_off enable row level security;

create policy "Rostered days off are readable by authenticated users"
  on public.consultant_rostered_days_off for select using (true);

create policy "Users can modify their own rostered days off"
  on public.consultant_rostered_days_off for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
