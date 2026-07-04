-- Callback contact types: count sales/points/GWP but not toward contact totals or conversion denominators.

alter table public.contact_types
  add column if not exists is_callback boolean not null default false;

update public.contact_types
set is_callback = false
where is_callback is distinct from false;

insert into public.contact_types (
  type_key,
  display_name,
  points_per_sale,
  expected_conversion_rate,
  sort_order,
  is_callback
)
values
  ('callback_outbound', 'Callback Outbound', 1.0, 0.28, 9, true),
  ('callback_inbound', 'Callback Inbound', 0.7, 0.60, 10, true),
  ('callback_schedule_a_call', 'Callback Schedule a call', 0.7, 0.70, 11, true),
  ('callback_cli', 'Callback CLI', 1.5, 0.10, 12, true),
  ('callback_crossvert', 'Callback Crossvert', 1.8, 0.10, 13, true),
  ('callback_crossvert_cli', 'Callback Crossvert CLI', 1.8, 0.10, 14, true),
  ('callback_billy', 'Callback Billy', 1.5, 0.10, 15, true),
  ('callback_billy_cli', 'Callback Billy CLI', 1.5, 0.10, 16, true)
on conflict (type_key) do update
set
  display_name = excluded.display_name,
  points_per_sale = excluded.points_per_sale,
  expected_conversion_rate = excluded.expected_conversion_rate,
  sort_order = excluded.sort_order,
  is_callback = excluded.is_callback;
