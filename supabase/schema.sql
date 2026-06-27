-- Commish 2.0 MVP schema
-- Run this in the Supabase SQL Editor

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz default now()
);

-- Monthly setups
create table if not exists public.monthly_setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  month int not null,
  year int not null,
  employment_type text not null check (employment_type in ('full-time', 'part-time')),
  full_time_target numeric not null,
  full_time_rostered_days numeric not null,
  user_rostered_days numeric not null,
  gwp_target numeric not null,
  conversion_target numeric default 0,
  starting_sales numeric default 0,
  starting_contacts numeric default 0,
  starting_gwp_total numeric default 0,
  starting_sales_points numeric default 0,
  created_at timestamptz default now(),
  unique(user_id, month, year)
);

-- Daily entries
create table if not exists public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  monthly_setup_id uuid references public.monthly_setups(id) on delete cascade not null,
  entry_date date not null,
  contacts numeric default 0,
  sales numeric default 0,
  gwp_total numeric default 0,
  sales_points numeric default 0,
  notes text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.monthly_setups enable row level security;
alter table public.daily_entries enable row level security;

-- Profiles policies
create policy "Users can view all profiles"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Monthly setups policies (own CRUD + read all for leaderboard)
create policy "Users can view all monthly setups"
  on public.monthly_setups for select
  using (true);

create policy "Users can insert their own monthly setups"
  on public.monthly_setups for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own monthly setups"
  on public.monthly_setups for update
  using (auth.uid() = user_id);

create policy "Users can delete their own monthly setups"
  on public.monthly_setups for delete
  using (auth.uid() = user_id);

-- Daily entries policies (own CRUD + read all for leaderboard)
create policy "Users can view all daily entries"
  on public.daily_entries for select
  using (true);

create policy "Users can insert their own daily entries"
  on public.daily_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own daily entries"
  on public.daily_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete their own daily entries"
  on public.daily_entries for delete
  using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for user each row execute procedure public.handle_new_user();
