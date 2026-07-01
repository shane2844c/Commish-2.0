"use client";

import ManualInputManager from "@/components/ManualInputManager";
import type { ContactTypeOption } from "@/lib/contactTypes/helpers";
import type { AdjustmentHistoryRow, ManualInputDefaultValues } from "@/lib/types";

type ManualInputClientProps = {
  consultantMonthId?: string;
  defaultValues: ManualInputDefaultValues;
  adjustmentHistory: AdjustmentHistoryRow[];
  contactTypes: ContactTypeOption[];
};

export default function ManualInputClient(props: ManualInputClientProps) {
  return <ManualInputManager {...props} />;
}
