"use client";

import ManualInputManager from "@/components/ManualInputManager";
import type { ManualInputDefaultValues } from "@/lib/types";

type AdjustmentHistoryRow = {
  id: string;
  entryDate: string | null;
  reason: string | null;
  contactTypeName: string;
  contactCount: number;
  convertedSalesCount: number;
  salesPoints: number;
};

type ManualInputClientProps = {
  consultantMonthId?: string;
  defaultValues: ManualInputDefaultValues;
  adjustmentHistory: AdjustmentHistoryRow[];
};

export default function ManualInputClient(props: ManualInputClientProps) {
  return <ManualInputManager {...props} />;
}
