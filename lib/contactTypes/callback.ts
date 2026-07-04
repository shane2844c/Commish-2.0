/**
 * Central callback contact-type rules.
 * Callback types count sales/points/GWP but never add to contact totals or conversion denominators.
 */

import { CALLBACK_CONTACT_TYPE_KEYS } from "@/lib/contactTypes/keys";

export { CALLBACK_CONTACT_TYPE_KEYS };

export type CallbackContactTypeKey = (typeof CALLBACK_CONTACT_TYPE_KEYS)[number];

export function isCallbackContactType(
  typeKey: string,
  contactTypes?: { type_key: string; is_callback?: boolean }[]
): boolean {
  if (contactTypes?.length) {
    const match = contactTypes.find((item) => item.type_key === typeKey);
    if (match && typeof match.is_callback === "boolean") {
      return match.is_callback;
    }
  }

  return (CALLBACK_CONTACT_TYPE_KEYS as readonly string[]).includes(typeKey);
}

export function baseContactTypeKey(typeKey: string): string {
  return isCallbackContactType(typeKey) ? typeKey.replace(/^callback_/, "") : typeKey;
}

export const CALLBACK_CONTACT_TYPE_HELPER =
  "Callback contact types count sales and points but do not add to contact totals or conversion rate.";
