export const CLI_CONTACT_TYPES = ["cli", "crossvert_cli", "billy_cli"] as const;

const NORMAL_CONTACT_DISPOSITIONS = [
  "converted_to_sale",
  "quote_no_sale",
  "crq",
  "quote_cant_beat",
] as const;

const CLI_ONLY_DISPOSITIONS = [
  "no_answer",
  "disgruntled",
  "wrong_number",
  "message_bank",
] as const;

export function isCliContactType(contactTypeKey: string): boolean {
  return (CLI_CONTACT_TYPES as readonly string[]).includes(contactTypeKey);
}

export function calculateCounts(contactTypeKey: string, dispositionKey: string) {
  const contactsCount = (NORMAL_CONTACT_DISPOSITIONS as readonly string[]).includes(dispositionKey)
    ? 1
    : (CLI_ONLY_DISPOSITIONS as readonly string[]).includes(dispositionKey) &&
        isCliContactType(contactTypeKey)
      ? 1
      : 0;

  const convertedSalesCount = dispositionKey === "converted_to_sale" ? 1 : 0;

  return {
    contacts_count: contactsCount,
    converted_sales_count: convertedSalesCount,
  };
}
