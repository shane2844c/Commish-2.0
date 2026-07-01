/** @deprecated Use contact types fetched from Supabase. Keys must match contact_types.type_key exactly. */
export type ContactTypeConfig = {
  type_key: string;
  display_name: string;
  points_per_sale: number;
  expected_conversion_rate: number;
  sort_order: number;
};
