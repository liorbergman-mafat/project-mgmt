import type { Location } from "./types";

/** The option list for one filter: unique, Hebrew-sorted, blanks dropped. */
export function options(rows: Location[], pick: (row: Location) => string | null): string[] {
  const seen = new Set(rows.map(pick).filter((v): v is string => Boolean(v)));
  return [...seen].sort((a, b) => a.localeCompare(b, "he"));
}

// The fixed briefing order for categories, not alphabetical. Anything not
// listed here (a category added later) sorts after these, alphabetically.
const CATEGORY_ORDER = [
  "סדיר קחצ״ר",
  "מילואים קחצ״ר",
  "חטמ״ר",
  "שריון + אש",
  "כלל צה״לי",
  "בא״חים",
  "חיצוניים",
];

export function sortCategories(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b, "he");
  });
}
