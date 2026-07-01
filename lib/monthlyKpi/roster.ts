import type { EmploymentTypeUi } from "@/lib/types";

export type MonthlyKpiInput = {
  month: number;
  year: number;
  employmentType: EmploymentTypeUi;
  fullTimePointsTarget: number;
  offDates?: string[];
  referenceDate?: Date;
};

export type MonthlyKpiResult = {
  fullTimeRosteredDays: number;
  baseRosteredDaysThisMonth: number;
  rosteredDaysOff: number;
  totalRosteredDaysThisMonth: number;
  adjustedPointsTarget: number;
  completedRosteredDaysSoFar: number;
};

export type ParsedOffDate = {
  year: number;
  month: number;
  day: number;
};

export function parseOffDate(offDate: string): ParsedOffDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(offDate.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isFullTimeWorkday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export function isPartTimeWorkday(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 1 || day === 2 || day === 6;
}

export function workdayPredicate(employmentType: EmploymentTypeUi): (date: Date) => boolean {
  return employmentType === "Part-time" ? isPartTimeWorkday : isFullTimeWorkday;
}

export function isRosteredWorkdayForType(
  offDate: string,
  employmentType: EmploymentTypeUi
): boolean {
  const parsed = parseOffDate(offDate);
  if (!parsed) {
    return false;
  }

  return workdayPredicate(employmentType)(new Date(parsed.year, parsed.month - 1, parsed.day));
}

export function validateRosteredDayOff(
  offDate: string,
  month: number,
  year: number,
  employmentType: EmploymentTypeUi
): string | null {
  const parsed = parseOffDate(offDate);
  if (!parsed) {
    return "Invalid date format.";
  }

  if (parsed.year !== year || parsed.month !== month) {
    return "The selected date must be within the selected month and year.";
  }

  if (!isRosteredWorkdayForType(offDate, employmentType)) {
    return employmentType === "Part-time"
      ? "That date is not a rostered part-time workday (Saturday–Tuesday)."
      : "That date is not a rostered full-time workday (Monday–Friday).";
  }

  return null;
}

function countWorkdaysInMonth(
  year: number,
  month: number,
  predicate: (date: Date) => boolean
): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    if (predicate(new Date(year, month - 1, day))) {
      count++;
    }
  }

  return count;
}

function countWorkdaysFromMonthStartToDate(
  year: number,
  month: number,
  endDate: Date,
  employmentType: EmploymentTypeUi
): number {
  const predicate = workdayPredicate(employmentType);
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDay =
    endDate.getFullYear() === year && endDate.getMonth() + 1 === month
      ? endDate.getDate()
      : daysInMonth;

  let count = 0;
  for (let day = 1; day <= endDay; day++) {
    if (predicate(new Date(year, month - 1, day))) {
      count++;
    }
  }

  return count;
}

function normalizeOffDatesForMonth(offDates: string[], month: number, year: number): string[] {
  const unique = new Set<string>();

  offDates.forEach((offDate) => {
    const parsed = parseOffDate(offDate);
    if (parsed && parsed.year === year && parsed.month === month) {
      unique.add(`${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`);
    }
  });

  return [...unique].sort();
}

function countOffDatesUpToDate(
  offDates: string[],
  month: number,
  year: number,
  endDate: Date
): number {
  const endDay =
    endDate.getFullYear() === year && endDate.getMonth() + 1 === month
      ? endDate.getDate()
      : new Date(year, month, 0).getDate();

  return normalizeOffDatesForMonth(offDates, month, year).filter((offDate) => {
    const parsed = parseOffDate(offDate);
    return parsed !== null && parsed.day <= endDay;
  }).length;
}

function getMonthPeriodStatus(
  year: number,
  month: number,
  referenceDate: Date
): "past" | "current" | "future" {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;

  if (year > refYear || (year === refYear && month > refMonth)) {
    return "future";
  }

  if (year < refYear || (year === refYear && month < refMonth)) {
    return "past";
  }

  return "current";
}

export function calculateMonthlyKpis(input: MonthlyKpiInput): MonthlyKpiResult {
  const month = Number(input.month || 0);
  const year = Number(input.year || 0);
  const fullTimePointsTarget = Number(input.fullTimePointsTarget || 0);
  const referenceDate = input.referenceDate ?? new Date();
  const normalizedOffDates = normalizeOffDatesForMonth(input.offDates ?? [], month, year);

  const fullTimeRosteredDays = countWorkdaysInMonth(year, month, isFullTimeWorkday);
  const baseRosteredDaysThisMonth = countWorkdaysInMonth(
    year,
    month,
    workdayPredicate(input.employmentType)
  );

  const rosteredDaysOff = normalizedOffDates.length;
  const totalRosteredDaysThisMonth = Math.max(baseRosteredDaysThisMonth - rosteredDaysOff, 0);

  const adjustedPointsTarget =
    fullTimeRosteredDays > 0
      ? (fullTimePointsTarget * totalRosteredDaysThisMonth) / fullTimeRosteredDays
      : 0;

  const monthStatus = getMonthPeriodStatus(year, month, referenceDate);
  let completedRosteredDaysSoFar = 0;

  if (monthStatus === "past") {
    completedRosteredDaysSoFar = totalRosteredDaysThisMonth;
  } else if (monthStatus === "current") {
    const elapsedWorkdays = countWorkdaysFromMonthStartToDate(
      year,
      month,
      referenceDate,
      input.employmentType
    );
    const offDaysSoFar = countOffDatesUpToDate(normalizedOffDates, month, year, referenceDate);
    completedRosteredDaysSoFar = Math.min(
      Math.max(elapsedWorkdays - offDaysSoFar, 0),
      totalRosteredDaysThisMonth
    );
  }

  return {
    fullTimeRosteredDays,
    baseRosteredDaysThisMonth,
    rosteredDaysOff,
    totalRosteredDaysThisMonth,
    adjustedPointsTarget,
    completedRosteredDaysSoFar,
  };
}

export function buildConsultantMonthKpiFields(
  input: MonthlyKpiInput
): MonthlyKpiResult & { fullTimePointsTarget: number } {
  const kpis = calculateMonthlyKpis(input);
  return {
    ...kpis,
    fullTimePointsTarget: Number(input.fullTimePointsTarget || 0),
  };
}
