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
  full_time_points_target numeric default 0,
  full_time_rostered_days numeric not null,
  user_rostered_days numeric not null,
  gwp_target numeric not null,
  conversion_target numeric default 0,
  inbound_target numeric default 0,
  outbound_target numeric default 0,
  transfer_target numeric default 0,
  starting_sales numeric default 0,
  starting_contacts numeric default 0,
  starting_inbound_contacts numeric default 0,
  starting_outbound_contacts numeric default 0,
  starting_transfer_contacts numeric default 0,
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
  inbound_contacts numeric default 0,
  outbound_contacts numeric default 0,
  transfer_contacts numeric default 0,
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

-- Safe migration helpers for existing projects
alter table public.monthly_setups add column if not exists full_time_points_target numeric default 0;
alter table public.monthly_setups add column if not exists inbound_target numeric default 0;
alter table public.monthly_setups add column if not exists outbound_target numeric default 0;
alter table public.monthly_setups add column if not exists transfer_target numeric default 0;
alter table public.monthly_setups add column if not exists starting_inbound_contacts numeric default 0;
alter table public.monthly_setups add column if not exists starting_outbound_contacts numeric default 0;
alter table public.monthly_setups add column if not exists starting_transfer_contacts numeric default 0;

alter table public.daily_entries add column if not exists inbound_contacts numeric default 0;
alter table public.daily_entries add column if not exists outbound_contacts numeric default 0;
alter table public.daily_entries add column if not exists transfer_contacts numeric default 0;

update public.monthly_setups
set
  full_time_points_target = case
    when coalesce(full_time_points_target, 0) = 0 then coalesce(full_time_target, 0)
    else full_time_points_target
  end,
  inbound_target = case
    when coalesce(inbound_target, 0) = 0 then coalesce(conversion_target, 0)
    else inbound_target
  end,
  outbound_target = case
    when coalesce(outbound_target, 0) = 0 then coalesce(conversion_target, 0)
    else outbound_target
  end,
  transfer_target = case
    when coalesce(transfer_target, 0) = 0 then coalesce(conversion_target, 0)
    else transfer_target
  end,
  starting_inbound_contacts = case
    when coalesce(starting_inbound_contacts, 0) = 0 and coalesce(starting_contacts, 0) > 0
      then starting_contacts
    else starting_inbound_contacts
  end;

update public.daily_entries
set inbound_contacts = coalesce(contacts, 0)
where coalesce(inbound_contacts, 0) = 0 and coalesce(contacts, 0) > 0;

-- New normalized performance model
create table if not exists public.consultant_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  month int not null,
  year int not null,
  employment_type text not null check (employment_type in ('full-time', 'part-time')),
  full_time_target numeric not null,
  full_time_points_target numeric not null,
  full_time_rostered_days numeric not null,
  user_rostered_days numeric not null,
  inbound_target numeric not null default 0,
  outbound_target numeric not null default 0,
  transfer_target numeric not null default 0,
  created_at timestamptz default now(),
  unique(user_id, month, year)
);

create table if not exists public.daily_contact_entries (
  id uuid primary key default gen_random_uuid(),
  consultant_month_id uuid references public.consultant_months(id) on delete cascade not null,
  entry_date date,
  source text not null check (source in ('baseline', 'daily', 'adjustment')),
  inbound_contacts numeric not null default 0,
  outbound_contacts numeric not null default 0,
  transfer_contacts numeric not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.sales_entries (
  id uuid primary key default gen_random_uuid(),
  consultant_month_id uuid references public.consultant_months(id) on delete cascade not null,
  entry_date date,
  source text not null check (source in ('baseline', 'daily', 'adjustment')),
  actual_sales numeric not null default 0,
  sales_points numeric not null default 0,
  gwp_amount numeric not null default 0,
  notes text,
  created_at timestamptz default now()
);

create unique index if not exists consultant_months_user_period_idx
  on public.consultant_months (user_id, month, year);

drop index if exists daily_contact_entries_baseline_unique;
drop index if exists sales_entries_baseline_unique;
drop index if exists daily_contact_entries_daily_unique;
drop index if exists sales_entries_daily_unique;

create unique index if not exists daily_contact_entries_unique_entry
  on public.daily_contact_entries (consultant_month_id, source, entry_date);

create unique index if not exists sales_entries_unique_entry
  on public.sales_entries (consultant_month_id, source, entry_date);

alter table public.consultant_months enable row level security;
alter table public.daily_contact_entries enable row level security;
alter table public.sales_entries enable row level security;

drop policy if exists "Users can view all consultant months" on public.consultant_months;
create policy "Users can view all consultant months"
  on public.consultant_months for select
  using (true);

drop policy if exists "Users can insert their own consultant months" on public.consultant_months;
create policy "Users can insert their own consultant months"
  on public.consultant_months for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own consultant months" on public.consultant_months;
create policy "Users can update their own consultant months"
  on public.consultant_months for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own consultant months" on public.consultant_months;
create policy "Users can delete their own consultant months"
  on public.consultant_months for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view all contact entries" on public.daily_contact_entries;
create policy "Users can view all contact entries"
  on public.daily_contact_entries for select
  using (true);

drop policy if exists "Users can modify own contact entries" on public.daily_contact_entries;
create policy "Users can modify own contact entries"
  on public.daily_contact_entries for all
  using (
    exists (
      select 1
      from public.consultant_months cm
      where cm.id = daily_contact_entries.consultant_month_id
        and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.consultant_months cm
      where cm.id = daily_contact_entries.consultant_month_id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view all sales entries" on public.sales_entries;
create policy "Users can view all sales entries"
  on public.sales_entries for select
  using (true);

drop policy if exists "Users can modify own sales entries" on public.sales_entries;
create policy "Users can modify own sales entries"
  on public.sales_entries for all
  using (
    exists (
      select 1
      from public.consultant_months cm
      where cm.id = sales_entries.consultant_month_id
        and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.consultant_months cm
      where cm.id = sales_entries.consultant_month_id
        and cm.user_id = auth.uid()
    )
  );

insert into public.consultant_months (
  user_id, month, year, employment_type, full_time_target, full_time_points_target,
  full_time_rostered_days, user_rostered_days, inbound_target, outbound_target, transfer_target
)
select
  ms.user_id,
  ms.month,
  ms.year,
  ms.employment_type,
  ms.full_time_target,
  coalesce(nullif(ms.full_time_points_target, 0), ms.full_time_target),
  ms.full_time_rostered_days,
  ms.user_rostered_days,
  coalesce(ms.inbound_target, 0),
  coalesce(ms.outbound_target, 0),
  coalesce(ms.transfer_target, 0)
from public.monthly_setups ms
on conflict (user_id, month, year) do update
set
  employment_type = excluded.employment_type,
  full_time_target = excluded.full_time_target,
  full_time_points_target = excluded.full_time_points_target,
  full_time_rostered_days = excluded.full_time_rostered_days,
  user_rostered_days = excluded.user_rostered_days,
  inbound_target = excluded.inbound_target,
  outbound_target = excluded.outbound_target,
  transfer_target = excluded.transfer_target;

insert into public.daily_contact_entries (
  consultant_month_id, entry_date, source, inbound_contacts, outbound_contacts, transfer_contacts
)
select
  cm.id,
  make_date(ms.year, ms.month, 1),
  'baseline',
  coalesce(ms.starting_inbound_contacts, ms.starting_contacts, 0),
  coalesce(ms.starting_outbound_contacts, 0),
  coalesce(ms.starting_transfer_contacts, 0)
from public.monthly_setups ms
join public.consultant_months cm
  on cm.user_id = ms.user_id and cm.month = ms.month and cm.year = ms.year
on conflict (consultant_month_id, source, entry_date) do update
set
  inbound_contacts = excluded.inbound_contacts,
  outbound_contacts = excluded.outbound_contacts,
  transfer_contacts = excluded.transfer_contacts;

insert into public.sales_entries (
  consultant_month_id, entry_date, source, actual_sales, sales_points, gwp_amount, notes
)
select
  cm.id,
  make_date(ms.year, ms.month, 1),
  'baseline',
  coalesce(ms.starting_sales, 0),
  coalesce(ms.starting_sales_points, 0),
  coalesce(ms.starting_gwp_total, 0),
  null
from public.monthly_setups ms
join public.consultant_months cm
  on cm.user_id = ms.user_id and cm.month = ms.month and cm.year = ms.year
on conflict (consultant_month_id, source, entry_date) do update
set
  actual_sales = excluded.actual_sales,
  sales_points = excluded.sales_points,
  gwp_amount = excluded.gwp_amount;

insert into public.daily_contact_entries (
  consultant_month_id, entry_date, source, inbound_contacts, outbound_contacts, transfer_contacts
)
select
  cm.id,
  de.entry_date,
  'daily',
  coalesce(de.inbound_contacts, de.contacts, 0),
  coalesce(de.outbound_contacts, 0),
  coalesce(de.transfer_contacts, 0)
from public.daily_entries de
join public.consultant_months cm on cm.id = de.monthly_setup_id
on conflict (consultant_month_id, entry_date, source) do update
set
  inbound_contacts = excluded.inbound_contacts,
  outbound_contacts = excluded.outbound_contacts,
  transfer_contacts = excluded.transfer_contacts;

insert into public.sales_entries (
  consultant_month_id, entry_date, source, actual_sales, sales_points, gwp_amount, notes
)
select
  cm.id,
  de.entry_date,
  'daily',
  coalesce(de.sales, 0),
  coalesce(de.sales_points, 0),
  coalesce(de.gwp_total, 0),
  de.notes
from public.daily_entries de
join public.consultant_months cm on cm.id = de.monthly_setup_id
on conflict (consultant_month_id, entry_date, source) do update
set
  actual_sales = excluded.actual_sales,
  sales_points = excluded.sales_points,
  gwp_amount = excluded.gwp_amount,
  notes = excluded.notes;

create or replace view public.v_consultant_performance as
with contact_agg as (
  select
    consultant_month_id,
    sum(inbound_contacts) as inbound_contacts,
    sum(outbound_contacts) as outbound_contacts,
    sum(transfer_contacts) as transfer_contacts
  from public.daily_contact_entries
  group by consultant_month_id
),
sales_agg as (
  select
    consultant_month_id,
    sum(actual_sales) as actual_sales,
    sum(sales_points) as sales_points,
    sum(gwp_amount) as total_gwp
  from public.sales_entries
  group by consultant_month_id
),
completed_days as (
  select
    consultant_month_id,
    count(distinct entry_date) as completed_rostered_days
  from (
    select consultant_month_id, entry_date from public.daily_contact_entries where source = 'daily'
    union all
    select consultant_month_id, entry_date from public.sales_entries where source = 'daily'
  ) days
  where entry_date is not null
  group by consultant_month_id
),
base as (
  select
    cm.id as consultant_month_id,
    cm.user_id,
    cm.month,
    cm.year,
    coalesce(ca.inbound_contacts, 0) as inbound_contacts,
    coalesce(ca.outbound_contacts, 0) as outbound_contacts,
    coalesce(ca.transfer_contacts, 0) as transfer_contacts,
    coalesce(sa.actual_sales, 0) as mtd_sales,
    coalesce(sa.sales_points, 0) as mtd_total_sales_points,
    coalesce(sa.total_gwp, 0) as mtd_total_gwp,
    coalesce(cd.completed_rostered_days, 0) as completed_rostered_days,
    cm.full_time_points_target,
    cm.user_rostered_days,
    cm.full_time_rostered_days,
    cm.inbound_target,
    cm.outbound_target,
    cm.transfer_target
  from public.consultant_months cm
  left join contact_agg ca on ca.consultant_month_id = cm.id
  left join sales_agg sa on sa.consultant_month_id = cm.id
  left join completed_days cd on cd.consultant_month_id = cm.id
),
calc as (
  select
    b.*,
    (b.inbound_contacts + b.outbound_contacts + b.transfer_contacts) as eligible_contacts,
    case
      when (b.inbound_contacts + b.outbound_contacts + b.transfer_contacts) > 0
        then b.mtd_sales / (b.inbound_contacts + b.outbound_contacts + b.transfer_contacts)
      else 0
    end as mtd_conversion_rate,
    case
      when (b.inbound_contacts + b.outbound_contacts + b.transfer_contacts) > 0
        then (
          (b.inbound_contacts * b.inbound_target) +
          (b.outbound_contacts * b.outbound_target) +
          (b.transfer_contacts * b.transfer_target)
        ) / (b.inbound_contacts + b.outbound_contacts + b.transfer_contacts)
      else 0
    end as mtd_target_conversion,
    case
      when b.mtd_sales > 0 then b.mtd_total_gwp / b.mtd_sales
      else 0
    end as average_gwp,
    case
      when b.full_time_rostered_days > 0
        then (b.full_time_points_target * b.user_rostered_days) / b.full_time_rostered_days
      else 0
    end as points_target
  from base b
),
tiers as (
  select
    c.*,
    case
      when c.mtd_target_conversion > 0 then c.mtd_conversion_rate / c.mtd_target_conversion
      else 0
    end as percent_to_target_conversion,
    case
      when c.mtd_total_sales_points >= 250 then 16
      when c.mtd_total_sales_points >= 200 then 14
      when c.mtd_total_sales_points >= 150 then 12
      when c.mtd_total_sales_points >= 100 then 10
      else 8
    end as base_dpp,
    case
      when c.average_gwp >= 160 then 2.5
      when c.average_gwp >= 140 then 2
      when c.average_gwp >= 120 then 1.5
      when c.average_gwp >= 100 then 1
      else 0
    end as gwp_payable_per_point
  from calc c
)
select
  t.consultant_month_id,
  t.user_id,
  t.month,
  t.year,
  t.eligible_contacts,
  t.mtd_sales,
  t.mtd_conversion_rate,
  t.mtd_target_conversion,
  t.percent_to_target_conversion,
  case
    when t.percent_to_target_conversion >= 1.2 then 1.2
    when t.percent_to_target_conversion >= 1.1 then 1.1
    when t.percent_to_target_conversion >= 1 then 1
    when t.percent_to_target_conversion >= 0.9 then 0.9
    else 0.8
  end as mtd_conversion_multiplier,
  t.mtd_total_sales_points,
  t.points_target,
  t.mtd_total_gwp,
  t.average_gwp,
  t.base_dpp,
  t.gwp_payable_per_point,
  (t.base_dpp + t.gwp_payable_per_point) as mtd_dpp,
  (t.mtd_total_sales_points * (t.base_dpp + t.gwp_payable_per_point) *
    case
      when t.percent_to_target_conversion >= 1.2 then 1.2
      when t.percent_to_target_conversion >= 1.1 then 1.1
      when t.percent_to_target_conversion >= 1 then 1
      when t.percent_to_target_conversion >= 0.9 then 0.9
      else 0.8
    end
  ) as mtd_commission,
  t.completed_rostered_days,
  t.user_rostered_days as total_rostered_days,
  case
    when t.completed_rostered_days > 0
      then (t.mtd_total_sales_points / t.completed_rostered_days) * t.user_rostered_days
    else 0
  end as projected_total_sales_points,
  case
    when (
      case
        when t.completed_rostered_days > 0
          then (t.mtd_total_sales_points / t.completed_rostered_days) * t.user_rostered_days
        else 0
      end
    ) >= 250 then 16
    when (
      case
        when t.completed_rostered_days > 0
          then (t.mtd_total_sales_points / t.completed_rostered_days) * t.user_rostered_days
        else 0
      end
    ) >= 200 then 14
    when (
      case
        when t.completed_rostered_days > 0
          then (t.mtd_total_sales_points / t.completed_rostered_days) * t.user_rostered_days
        else 0
      end
    ) >= 150 then 12
    when (
      case
        when t.completed_rostered_days > 0
          then (t.mtd_total_sales_points / t.completed_rostered_days) * t.user_rostered_days
        else 0
      end
    ) >= 100 then 10
    else 8
  end as projected_dpp,
  t.gwp_payable_per_point as projected_gwp_payable_per_point,
  case
    when t.percent_to_target_conversion >= 1.2 then 1.2
    when t.percent_to_target_conversion >= 1.1 then 1.1
    when t.percent_to_target_conversion >= 1 then 1
    when t.percent_to_target_conversion >= 0.9 then 0.9
    else 0.8
  end as projected_conversion_multiplier,
  (
    case
      when t.completed_rostered_days > 0
        then (t.mtd_total_sales_points / t.completed_rostered_days) * t.user_rostered_days
      else 0
    end
  ) * (
    case
      when (
        case
          when t.completed_rostered_days > 0
            then (t.mtd_total_sales_points / t.completed_rostered_days) * t.user_rostered_days
          else 0
        end
      ) >= 250 then 16
      when (
        case
          when t.completed_rostered_days > 0
            then (t.mtd_total_sales_points / t.completed_rostered_days) * t.user_rostered_days
          else 0
        end
      ) >= 200 then 14
      when (
        case
          when t.completed_rostered_days > 0
            then (t.mtd_total_sales_points / t.completed_rostered_days) * t.user_rostered_days
          else 0
        end
      ) >= 150 then 12
      when (
        case
          when t.completed_rostered_days > 0
            then (t.mtd_total_sales_points / t.completed_rostered_days) * t.user_rostered_days
          else 0
        end
      ) >= 100 then 10
      else 8
    end + t.gwp_payable_per_point
  ) * (
    case
      when t.percent_to_target_conversion >= 1.2 then 1.2
      when t.percent_to_target_conversion >= 1.1 then 1.1
      when t.percent_to_target_conversion >= 1 then 1
      when t.percent_to_target_conversion >= 0.9 then 0.9
      else 0.8
    end
  ) as projected_commission
from tiers t;
