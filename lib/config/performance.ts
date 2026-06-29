export type ContactTypeConfig = {
  slug: string;
  name: string;
  points: number;
  expectedConversionRate: number;
  sortOrder: number;
};

export type ContactOutcomeConfig = {
  slug: string;
  name: string;
  countsForConversionDenominator: boolean;
  countsAsSale: boolean;
  isExcluded: boolean;
  isMisdisposition: boolean;
  sortOrder: number;
};

export const CONTACT_TYPES: ContactTypeConfig[] = [
  { slug: "outbound", name: "Outbound", points: 1, expectedConversionRate: 0.28, sortOrder: 1 },
  { slug: "inbound", name: "Inbound", points: 0.7, expectedConversionRate: 0.6, sortOrder: 2 },
  {
    slug: "schedule-a-call",
    name: "Schedule a call",
    points: 0.7,
    expectedConversionRate: 0.7,
    sortOrder: 3,
  },
  { slug: "cli", name: "CLI", points: 1.5, expectedConversionRate: 0.1, sortOrder: 4 },
  { slug: "crossvert", name: "Crossvert", points: 1.8, expectedConversionRate: 0.1, sortOrder: 5 },
  {
    slug: "crossvert-cli",
    name: "Crossvert CLI",
    points: 1.8,
    expectedConversionRate: 0.1,
    sortOrder: 6,
  },
  { slug: "billy", name: "Billy", points: 1.5, expectedConversionRate: 0.1, sortOrder: 7 },
  {
    slug: "billy-cli",
    name: "Billy CLI",
    points: 1.5,
    expectedConversionRate: 0.1,
    sortOrder: 8,
  },
];

export const CONTACT_OUTCOMES: ContactOutcomeConfig[] = [
  {
    slug: "converted-to-sale",
    name: "Converted to sale",
    countsForConversionDenominator: true,
    countsAsSale: true,
    isExcluded: false,
    isMisdisposition: false,
    sortOrder: 1,
  },
  {
    slug: "contact-refused-quote",
    name: "Contact Refused Quote",
    countsForConversionDenominator: true,
    countsAsSale: false,
    isExcluded: false,
    isMisdisposition: false,
    sortOrder: 2,
  },
  {
    slug: "quote-no-sale",
    name: "Quote no sale",
    countsForConversionDenominator: true,
    countsAsSale: false,
    isExcluded: false,
    isMisdisposition: false,
    sortOrder: 3,
  },
  {
    slug: "no-answer",
    name: "No answer",
    countsForConversionDenominator: true,
    countsAsSale: false,
    isExcluded: false,
    isMisdisposition: false,
    sortOrder: 4,
  },
  {
    slug: "disgruntled-customer",
    name: "Disgruntled Customer",
    countsForConversionDenominator: false,
    countsAsSale: false,
    isExcluded: true,
    isMisdisposition: true,
    sortOrder: 5,
  },
  {
    slug: "gold-not-sales-enquiry",
    name: "Gold not sales enquiry",
    countsForConversionDenominator: false,
    countsAsSale: false,
    isExcluded: true,
    isMisdisposition: true,
    sortOrder: 6,
  },
  {
    slug: "messagebank",
    name: "Messagebank",
    countsForConversionDenominator: true,
    countsAsSale: false,
    isExcluded: false,
    isMisdisposition: false,
    sortOrder: 7,
  },
];

export const CONTACT_TYPE_BY_SLUG = new Map(CONTACT_TYPES.map((item) => [item.slug, item]));
export const CONTACT_OUTCOME_BY_SLUG = new Map(CONTACT_OUTCOMES.map((item) => [item.slug, item]));
