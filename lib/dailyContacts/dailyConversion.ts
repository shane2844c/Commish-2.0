import type { ContactTypeOption } from "@/lib/contactTypes/helpers";

export type DailyContactEntryForCalc = {
  entryDate: string;
  contactTypeKey: string;
  contactsCount: number;
  convertedSalesCount: number;
  totalGwp: number;
  salesPoints: number;
};

export type DailyConversionPerformance = {
  dailyContacts: number;
  dailyConvertedSales: number;
  salesPointsToday: number;
  averageGwpToday: number;
  dailyActualConversion: number;
  dailyTargetConversion: number;
  dailyPercentToTargetConversion: number;
};

function expectedConversionRate(contactTypes: ContactTypeOption[], typeKey: string): number {
  return Number(contactTypes.find((item) => item.type_key === typeKey)?.expected_conversion_rate ?? 0);
}

export function calculateDailyConversionPerformance(
  entries: DailyContactEntryForCalc[],
  contactTypes: ContactTypeOption[],
  selectedDate: string
): DailyConversionPerformance {
  const dayEntries = entries.filter((entry) => entry.entryDate === selectedDate);

  const dailyContacts = dayEntries.reduce((sum, entry) => sum + entry.contactsCount, 0);
  const dailyConvertedSales = dayEntries.reduce((sum, entry) => sum + entry.convertedSalesCount, 0);
  const salesPointsToday = dayEntries.reduce((sum, entry) => sum + entry.salesPoints, 0);
  const totalGwp = dayEntries.reduce((sum, entry) => sum + entry.totalGwp, 0);
  const averageGwpToday = dailyConvertedSales > 0 ? totalGwp / dailyConvertedSales : 0;

  const dailyActualConversion = dailyContacts > 0 ? dailyConvertedSales / dailyContacts : 0;

  const blendedNumerator = dayEntries.reduce(
    (sum, entry) => sum + entry.contactsCount * expectedConversionRate(contactTypes, entry.contactTypeKey),
    0
  );
  const dailyTargetConversion = dailyContacts > 0 ? blendedNumerator / dailyContacts : 0;
  const dailyPercentToTargetConversion =
    dailyTargetConversion > 0 ? dailyActualConversion / dailyTargetConversion : 0;

  return {
    dailyContacts,
    dailyConvertedSales,
    salesPointsToday,
    averageGwpToday,
    dailyActualConversion,
    dailyTargetConversion,
    dailyPercentToTargetConversion,
  };
}

export function logDailyConversionPerformance(performance: DailyConversionPerformance): void {
  console.log("Daily contacts:", performance.dailyContacts);
  console.log("Daily converted sales:", performance.dailyConvertedSales);
  console.log("Daily actual conversion:", performance.dailyActualConversion);
  console.log("Daily target conversion:", performance.dailyTargetConversion);
  console.log("Daily % to target conversion:", performance.dailyPercentToTargetConversion);
}
