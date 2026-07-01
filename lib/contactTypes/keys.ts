export const VALID_CONTACT_TYPE_KEYS = [
  "outbound",
  "inbound",
  "schedule_a_call",
  "cli",
  "crossvert",
  "crossvert_cli",
  "billy",
  "billy_cli",
] as const;

export type ValidContactTypeKey = (typeof VALID_CONTACT_TYPE_KEYS)[number];

export function isValidContactTypeKey(key: string): key is ValidContactTypeKey {
  return (VALID_CONTACT_TYPE_KEYS as readonly string[]).includes(key);
}

export function assertValidContactTypeKey(key: string): void {
  if (!isValidContactTypeKey(key)) {
    throw new Error(
      `Invalid contact_type_key: "${key}". Must be one of: ${VALID_CONTACT_TYPE_KEYS.join(", ")}`
    );
  }
}
