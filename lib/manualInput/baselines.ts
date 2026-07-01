type BaselineRowLike = {
  contact_type_key: string;
  created_at?: string;
  updated_at?: string;
};

export function dedupeBaselineRowsByContactType<T extends BaselineRowLike>(
  rows: T[]
): T[] {
  const byType = new Map<string, T>();

  rows.forEach((row) => {
    const existing = byType.get(row.contact_type_key);
    if (!existing) {
      byType.set(row.contact_type_key, row);
      return;
    }

    const existingStamp = existing.updated_at ?? existing.created_at ?? "";
    const rowStamp = row.updated_at ?? row.created_at ?? "";
    if (rowStamp >= existingStamp) {
      byType.set(row.contact_type_key, row);
    }
  });

  return [...byType.values()];
}
