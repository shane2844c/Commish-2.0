-- Commish 2.0 schema (source of truth)

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.consultant_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  month int not null,
  year int not null,
  employment_type text not null check (employment_type in ('full_time', 'part_time')),
  full_time_points_target numeric not null,
  full_time_rostered_days numeric not null,
  base_rostered_days_this_month numeric not null default 0,
  rostered_days_off numeric not null default 0,
  total_rostered_days_this_month numeric not null,
  adjusted_points_target numeric not null default 0,
  completed_rostered_days_so_far numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, month, year)
);

create table if not exists public.contact_types (
  type_key text primary key,
  display_name text not null,
  points_per_sale numeric not null,
  expected_conversion_rate numeric not null,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.monthly_contact_baselines (
  id uuid primary key default gen_random_uuid(),
  consultant_month_id uuid references public.consultant_months(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  contact_type_key text references public.contact_types(type_key) not null,
  total_contacts_so_far numeric not null default 0,
  converted_sales_so_far numeric not null default 0,
  total_gwp_so_far numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(consultant_month_id, contact_type_key)
);

create table if not exists public.contact_dispositions (
  disposition_key text primary key,
  display_name text not null,
  counts_as_contact_by_default boolean not null default false,
  counts_as_sale boolean not null default false,
  counts_as_contact_for_cli_only boolean not null default false,
  requires_gwp boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.daily_contact_entries (
  id uuid primary key default gen_random_uuid(),
  consultant_month_id uuid references public.consultant_months(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  entry_date date not null,
  contact_type_key text references public.contact_types(type_key) not null,
  disposition_key text references public.contact_dispositions(disposition_key) not null,
  contacts_count numeric not null default 0,
  converted_sales_count numeric not null default 0,
  total_gwp numeric not null default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Individual contact entries: no unique on (consultant_month_id, entry_date, contact_type_key).
-- Multiple rows per date/type are allowed; daily_contact_entries.id is the row identifier.

create table if not exists public.manual_contact_adjustments (
  id uuid primary key default gen_random_uuid(),
  consultant_month_id uuid references public.consultant_months(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  adjustment_date date not null,
  contact_type_key text references public.contact_types(type_key) not null,
  contacts_delta numeric not null default 0,
  converted_sales_delta numeric not null default 0,
  total_gwp_delta numeric not null default 0,
  reason text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.consultant_rostered_days_off (
  id uuid primary key default gen_random_uuid(),
  consultant_month_id uuid references public.consultant_months(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  off_date date not null,
  reason text,
  created_at timestamptz default now(),
  unique(consultant_month_id, off_date)
);

alter table public.profiles enable row level security;
alter table public.consultant_months enable row level security;
alter table public.contact_types enable row level security;
alter table public.contact_dispositions enable row level security;
alter table public.monthly_contact_baselines enable row level security;
alter table public.daily_contact_entries enable row level security;
alter table public.manual_contact_adjustments enable row level security;
alter table public.consultant_rostered_days_off enable row level security;

create policy "Profiles are readable by authenticated users"
  on public.profiles for select using (true);

create policy "Users can upsert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Consultant months are readable by authenticated users"
  on public.consultant_months for select using (true);

create policy "Users can insert their own consultant months"
  on public.consultant_months for insert with check (auth.uid() = user_id);

create policy "Users can update their own consultant months"
  on public.consultant_months for update using (auth.uid() = user_id);

create policy "Users can delete their own consultant months"
  on public.consultant_months for delete using (auth.uid() = user_id);

create policy "Contact types are readable by authenticated users"
  on public.contact_types for select using (true);

create policy "Contact dispositions are readable by authenticated users"
  on public.contact_dispositions for select using (true);

create policy "Baselines are readable by authenticated users"
  on public.monthly_contact_baselines for select using (true);

create policy "Users can modify their own baselines"
  on public.monthly_contact_baselines for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Daily entries are readable by authenticated users"
  on public.daily_contact_entries for select using (true);

create policy "Users can modify their own daily entries"
  on public.daily_contact_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Adjustments are readable by authenticated users"
  on public.manual_contact_adjustments for select using (true);

create policy "Users can modify their own adjustments"
  on public.manual_contact_adjustments for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Rostered days off are readable by authenticated users"
  on public.consultant_rostered_days_off for select using (true);

create policy "Users can modify their own rostered days off"
  on public.consultant_rostered_days_off for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.contact_types (type_key, display_name, points_per_sale, expected_conversion_rate, sort_order)
values
  ('outbound', 'Outbound', 1.0, 0.28, 1),
  ('inbound', 'Inbound', 0.7, 0.60, 2),
  ('schedule_a_call', 'Schedule a call', 0.7, 0.70, 3),
  ('cli', 'CLI', 1.5, 0.10, 4),
  ('crossvert', 'Crossvert', 1.8, 0.10, 5),
  ('crossvert_cli', 'Crossvert CLI', 1.8, 0.10, 6),
  ('billy', 'Billy', 1.5, 0.10, 7),
  ('billy_cli', 'Billy CLI', 1.5, 0.10, 8)
on conflict (type_key) do update
set
  display_name = excluded.display_name,
  points_per_sale = excluded.points_per_sale,
  expected_conversion_rate = excluded.expected_conversion_rate,
  sort_order = excluded.sort_order;

insert into public.contact_dispositions (
  disposition_key,
  display_name,
  counts_as_contact_by_default,
  counts_as_sale,
  counts_as_contact_for_cli_only,
  requires_gwp,
  sort_order
)
values
  ('converted_to_sale', 'Converted to sale', true, true, false, true, 1),
  ('quote_no_sale', 'Quote no sale', true, false, false, false, 2),
  ('crq', 'CRQ', true, false, false, false, 3),
  ('quote_cant_beat', 'Quote - can''t beat', true, false, false, false, 4),
  ('no_answer', 'No answer', false, false, true, false, 5),
  ('disgruntled', 'Disgruntled', false, false, true, false, 6),
  ('wrong_number', 'Wrong number', false, false, true, false, 7),
  ('message_bank', 'Message bank', false, false, true, false, 8)
on conflict (disposition_key) do update
set
  display_name = excluded.display_name,
  counts_as_contact_by_default = excluded.counts_as_contact_by_default,
  counts_as_sale = excluded.counts_as_sale,
  counts_as_contact_for_cli_only = excluded.counts_as_contact_for_cli_only,
  requires_gwp = excluded.requires_gwp,
  sort_order = excluded.sort_order;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, profiles.full_name),
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
