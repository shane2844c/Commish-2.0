alter table public.consultant_months
  add column if not exists base_rostered_days_this_month numeric,
  add column if not exists rostered_days_off numeric not null default 0,
  add column if not exists adjusted_points_target numeric;

update public.consultant_months
set
  base_rostered_days_this_month = coalesce(base_rostered_days_this_month, total_rostered_days_this_month),
  adjusted_points_target = coalesce(
    adjusted_points_target,
    case
      when full_time_rostered_days > 0 then
        full_time_points_target * total_rostered_days_this_month / full_time_rostered_days
      else 0
    end
  );

alter table public.consultant_months
  alter column base_rostered_days_this_month set not null,
  alter column base_rostered_days_this_month set default 0,
  alter column adjusted_points_target set not null,
  alter column adjusted_points_target set default 0;
