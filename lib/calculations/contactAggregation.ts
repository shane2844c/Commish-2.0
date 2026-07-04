import { isCallbackContactType } from "@/lib/contactTypes/callback";
import type { ContactTypeRow } from "@/lib/types";

export type MtdConversionBreakdown = {
  contactDenominator: number;
  salesNumerator: number;
  callbackEntriesExcludedFromContacts: number;
  callbackSalesIncludedInSales: number;
};

export function contactCountForConversion(
  typeKey: string,
  rawContactCount: number,
  contactTypes: ContactTypeRow[]
): number {
  if (isCallbackContactType(typeKey, contactTypes)) {
    return 0;
  }

  return rawContactCount;
}

export function createEmptyMtdConversionBreakdown(): MtdConversionBreakdown {
  return {
    contactDenominator: 0,
    salesNumerator: 0,
    callbackEntriesExcludedFromContacts: 0,
    callbackSalesIncludedInSales: 0,
  };
}

export function accumulateMtdConversionBreakdown(
  breakdown: MtdConversionBreakdown,
  typeKey: string,
  rawContacts: number,
  convertedSales: number,
  contactTypes: ContactTypeRow[]
): void {
  const isCallback = isCallbackContactType(typeKey, contactTypes);
  const contactsForConversion = isCallback ? 0 : rawContacts;

  breakdown.contactDenominator += contactsForConversion;
  breakdown.salesNumerator += convertedSales;

  if (isCallback) {
    breakdown.callbackSalesIncludedInSales += convertedSales;
  }
}
