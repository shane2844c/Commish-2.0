-- Remove duplicate baseline rows, keeping the most recently updated row per contact type.
delete from public.monthly_contact_baselines
where id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by consultant_month_id, contact_type_key
        order by coalesce(updated_at, created_at) desc, created_at desc
      ) as row_num
    from public.monthly_contact_baselines
  ) ranked
  where row_num > 1
);

-- Ensure one baseline row per consultant month + contact type (no-op if already present).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'monthly_contact_baselines_consultant_month_id_contact_type_key_key'
  ) then
    alter table public.monthly_contact_baselines
      add constraint monthly_contact_baselines_consultant_month_id_contact_type_key_key
      unique (consultant_month_id, contact_type_key);
  end if;
end $$;
