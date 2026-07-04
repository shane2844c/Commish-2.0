export const CALLBACK_CONTACT_TYPE_KEYS = [
  "callback_outbound",
  "callback_inbound",
  "callback_schedule_a_call",
  "callback_cli",
  "callback_crossvert",
  "callback_crossvert_cli",
  "callback_billy",
  "callback_billy_cli",
] as const;

export const VALID_CONTACT_TYPE_KEYS = [
  "outbound",
  "inbound",
  "schedule_a_call",
  "cli",
  "crossvert",
  "crossvert_cli",
  "billy",
  "billy_cli",
  ...CALLBACK_CONTACT_TYPE_KEYS,
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
