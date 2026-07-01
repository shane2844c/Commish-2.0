-- Allow multiple daily contact entries per date + contact type.
-- Each submission is one individual contact; id is the unique row identifier.

alter table public.daily_contact_entries
  drop constraint if exists daily_contact_entries_month_date_type_unique;
